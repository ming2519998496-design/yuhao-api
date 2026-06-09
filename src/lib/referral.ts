import { createAdminClient } from "@/lib/supabase-admin";
import {
  markRechargeCompleted,
  revertRechargeToPending,
} from "@/lib/recharge-records-db";
import {
  FIRST_RECHARGE_MIN_YUAN,
  NEW_USER_FIRST_RECHARGE_BONUS_YUAN,
  REFERRAL_REWARD_RATE,
} from "@/lib/referral-program";
import { creditUserBalance, getUserTotalBalance } from "@/lib/user-balance";
import crypto from "crypto";

export {
  FIRST_RECHARGE_MIN_YUAN,
  NEW_USER_FIRST_RECHARGE_BONUS_YUAN,
  REFERRAL_REWARD_RATE,
  REFERRAL_PROGRAM_HEADLINE,
  REFERRAL_PROGRAM_INVITE_LINE,
  REFERRAL_PROGRAM_NOTES,
} from "@/lib/referral-program";

function isMissingSchemaError(message?: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find the table") ||
    m.includes("aff_code") ||
    m.includes("referred_by") ||
    m.includes("referral_earnings")
  );
}

export function generateAffCode(userId: string): string {
  const hash = crypto.createHash("sha256").update(userId).digest("base64url");
  return hash.slice(0, 8);
}

export async function ensureAffCode(userId: string): Promise<string> {
  const fallback = generateAffCode(userId);
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("aff_code")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      if (isMissingSchemaError(error.message)) return fallback;
      throw error;
    }

    if (data?.aff_code) return data.aff_code;

    let code = fallback;
    for (let i = 0; i < 5; i++) {
      const { data: conflict, error: conflictErr } = await admin
        .from("profiles")
        .select("id")
        .eq("aff_code", code)
        .maybeSingle();
      if (conflictErr && isMissingSchemaError(conflictErr.message)) {
        return fallback;
      }
      if (!conflict || conflict.id === userId) break;
      code = generateAffCode(userId + String(i));
    }

    const { error: updateErr } = await admin
      .from("profiles")
      .update({ aff_code: code, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateErr && isMissingSchemaError(updateErr.message)) {
      return fallback;
    }

    return code;
  } catch {
    return fallback;
  }
}

/** 注册时绑定邀请人（仅首次、不可自荐） */
export async function bindReferrer(
  userId: string,
  affCode: string | null | undefined
): Promise<void> {
  if (!affCode?.trim()) return;

  try {
    const admin = createAdminClient();
    const code = affCode.trim();

    const { data: self, error: selfErr } = await admin
      .from("profiles")
      .select("referred_by, aff_code")
      .eq("id", userId)
      .maybeSingle();

    if (selfErr) {
      if (isMissingSchemaError(selfErr.message)) return;
      throw selfErr;
    }
    if (self?.referred_by) return;

    const { data: referrer, error: refErr } = await admin
      .from("profiles")
      .select("id, aff_code")
      .eq("aff_code", code)
      .maybeSingle();

    if (refErr) {
      if (isMissingSchemaError(refErr.message)) return;
      throw refErr;
    }
    if (!referrer || referrer.id === userId) return;

    await admin
      .from("profiles")
      .update({
        referred_by: referrer.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  } catch {
    /* 邀请表未迁移时不阻断登录 */
  }
}

export type CompleteRechargeResult = {
  ok: boolean;
  error?: string;
  userId?: string;
  amount?: number;
  newBalance?: number;
  alreadyCompleted?: boolean;
};

/** 充值到账后：给对应用户加余额（兼容旧 pending 记录的手动确认） */
export async function completeRechargeAndRewards(
  recordId: number,
  confirmedAmount?: number
): Promise<CompleteRechargeResult> {
  const admin = createAdminClient();

  if (confirmedAmount !== undefined) {
    const amount = Number(Number(confirmedAmount).toFixed(2));
    if (!Number.isFinite(amount) || amount < 1) {
      return { ok: false, error: "到账金额至少为 ¥1" };
    }
  }

  const { data: claimed, error: claimErr } = await markRechargeCompleted(
    admin,
    recordId,
    confirmedAmount !== undefined
      ? Number(Number(confirmedAmount).toFixed(2))
      : undefined
  );

  if (claimErr) {
    return { ok: false, error: claimErr.message };
  }

  if (!claimed) {
    const { data: existing } = await admin
      .from("recharge_records")
      .select("id, user_id, amount, status")
      .eq("id", recordId)
      .maybeSingle();

    if (!existing) {
      return { ok: false, error: "充值记录不存在" };
    }
    if (existing.status === "completed") {
      const newBalance = await getUserTotalBalance(existing.user_id);
      return {
        ok: true,
        alreadyCompleted: true,
        userId: existing.user_id,
        amount: Number(existing.amount),
        newBalance: Number(newBalance.toFixed(2)),
      };
    }
    return { ok: false, error: "该充值记录无法确认（可能已被拒绝）" };
  }

  const amount = Number(claimed.amount);
  const userId = claimed.user_id as string;

  let newBalance: number;
  try {
    newBalance = await creditUserBalance(userId, amount);
    newBalance = await applyReferralProgramOnRecharge(userId, recordId, amount);
  } catch (e) {
    await revertRechargeToPending(admin, recordId);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "余额入账失败",
    };
  }

  return {
    ok: true,
    userId,
    amount,
    newBalance: Number(newBalance.toFixed(2)),
  };
}

async function countCompletedRecharges(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<number> {
  const { count, error } = await admin
    .from("recharge_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function rewardsAlreadyGranted(
  admin: ReturnType<typeof createAdminClient>,
  recordId: number
): Promise<boolean> {
  const { count, error } = await admin
    .from("referral_earnings")
    .select("id", { count: "exact", head: true })
    .eq("recharge_record_id", recordId);

  if (error) {
    if (isMissingSchemaError(error.message)) return false;
    throw new Error(error.message);
  }
  return (count ?? 0) > 0;
}

/**
 * 首充活动：满 ¥50 送 ¥5；邀请人与被邀请人各得首充金额 5%（仅首笔到账充值）。
 * 返回最新账户余额。
 */
export async function applyReferralProgramOnRecharge(
  userId: string,
  recordId: number,
  amount: number
): Promise<number> {
  const admin = createAdminClient();

  const completedCount = await countCompletedRecharges(admin, userId);
  if (completedCount !== 1 || amount < FIRST_RECHARGE_MIN_YUAN) {
    return getUserTotalBalance(userId);
  }

  if (await rewardsAlreadyGranted(admin, recordId)) {
    return getUserTotalBalance(userId);
  }

  await creditUserBalance(userId, NEW_USER_FIRST_RECHARGE_BONUS_YUAN);

  const rewardAmount = Number((amount * REFERRAL_REWARD_RATE).toFixed(4));
  if (rewardAmount <= 0) {
    return getUserTotalBalance(userId);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", userId)
    .maybeSingle();

  const referrerId = profile?.referred_by;
  if (!referrerId || referrerId === userId) {
    return getUserTotalBalance(userId);
  }

  const rows = [
    {
      referrer_id: referrerId,
      referred_user_id: userId,
      recharge_record_id: recordId,
      recharge_amount: amount,
      reward_amount: rewardAmount,
      reward_rate: REFERRAL_REWARD_RATE,
      status: "available" as const,
    },
    {
      referrer_id: userId,
      referred_user_id: userId,
      recharge_record_id: recordId,
      recharge_amount: amount,
      reward_amount: rewardAmount,
      reward_rate: REFERRAL_REWARD_RATE,
      status: "available" as const,
    },
  ];

  const { error: insertErr } = await admin.from("referral_earnings").insert(rows);
  if (insertErr && !isMissingSchemaError(insertErr.message)) {
    throw new Error(insertErr.message);
  }

  return getUserTotalBalance(userId);
}

export async function getReferralStats(userId: string) {
  const admin = createAdminClient();
  const affCode = await ensureAffCode(userId);

  let inviteCount = 0;
  const { count, error: inviteErr } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("referred_by", userId);

  if (!inviteErr) inviteCount = count ?? 0;
  else if (!isMissingSchemaError(inviteErr.message)) throw inviteErr;

  let pendingAmount = 0;
  let totalEarned = 0;
  const { data: earnings, error: earnErr } = await admin
    .from("referral_earnings")
    .select("reward_amount, status")
    .eq("referrer_id", userId);

  if (!earnErr) {
    for (const e of earnings ?? []) {
      const amt = Number(e.reward_amount);
      totalEarned += amt;
      if (e.status === "available") pendingAmount += amt;
    }
  } else if (!isMissingSchemaError(earnErr.message)) {
    throw earnErr;
  }

  return {
    affCode,
    inviteCount,
    pendingAmount: Number(pendingAmount.toFixed(2)),
    totalEarned: Number(totalEarned.toFixed(2)),
    rewardRatePercent: Math.round(REFERRAL_REWARD_RATE * 100),
    firstRechargeMinYuan: FIRST_RECHARGE_MIN_YUAN,
    newUserBonusYuan: NEW_USER_FIRST_RECHARGE_BONUS_YUAN,
    schemaReady: !inviteErr && !earnErr,
  };
}

/** 将待使用收益划转到 API 余额 */
export async function transferReferralToBalance(
  userId: string
): Promise<{ ok: boolean; amount?: number; error?: string }> {
  const admin = createAdminClient();

  const { data: available } = await admin
    .from("referral_earnings")
    .select("id, reward_amount")
    .eq("referrer_id", userId)
    .eq("status", "available");

  if (!available?.length) {
    return { ok: false, error: "暂无可划转收益" };
  }

  const total = available.reduce((s, r) => s + Number(r.reward_amount), 0);
  if (total <= 0) {
    return { ok: false, error: "暂无可划转收益" };
  }

  await creditUserBalance(userId, total);

  await admin
    .from("referral_earnings")
    .update({ status: "transferred" })
    .in(
      "id",
      available.map((r) => r.id)
    );

  return { ok: true, amount: Number(total.toFixed(2)) };
}
