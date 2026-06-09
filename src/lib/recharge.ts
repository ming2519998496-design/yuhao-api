import { createAdminClient } from "@/lib/supabase-admin";
import { applyReferralProgramOnRecharge } from "@/lib/referral";
import {
  creditUserBalance,
  getUserTotalBalance,
  setProfileBalance,
} from "@/lib/user-balance";
import { generateRechargeOrderNo, isMissingCompletedAtColumn, isMissingOrderNoColumn } from "@/lib/recharge-records";

export type ApplyRechargeResult = {
  ok: boolean;
  error?: string;
  recordId?: number;
  newBalance?: number;
};

/** 用户充值到账：写 completed 记录 + 加余额 + 邀请奖励 */
export async function applyUserRecharge(
  userId: string,
  amount: number,
  method: string
): Promise<ApplyRechargeResult> {
  const admin = createAdminClient();

  const base = {
    user_id: userId,
    amount,
    method,
    status: "completed" as const,
  };
  const now = new Date().toISOString();

  let record: { id: number } | null = null;
  let insertErr: { message: string } | null = null;

  const withOrder = await admin
    .from("recharge_records")
    .insert({
      ...base,
      order_no: generateRechargeOrderNo(),
      completed_at: now,
    })
    .select("id")
    .single();

  if (!withOrder.error && withOrder.data) {
    record = withOrder.data;
  } else {
    insertErr = withOrder.error;
    if (insertErr && isMissingOrderNoColumn(insertErr.message)) {
      const legacy = await admin
        .from("recharge_records")
        .insert(base)
        .select("id")
        .single();
      if (!legacy.error && legacy.data) record = legacy.data;
      else insertErr = legacy.error;
    } else if (
      insertErr &&
      isMissingCompletedAtColumn(insertErr.message)
    ) {
      const noTime = await admin
        .from("recharge_records")
        .insert({
          ...base,
          order_no: generateRechargeOrderNo(),
        })
        .select("id")
        .single();
      if (!noTime.error && noTime.data) record = noTime.data;
      else insertErr = noTime.error;
    }
  }

  if (!record) {
    return { ok: false, error: insertErr?.message ?? "创建充值记录失败" };
  }

  try {
    await creditUserBalance(userId, amount);
    const newBalance = await applyReferralProgramOnRecharge(
      userId,
      record.id,
      amount
    );
    return {
      ok: true,
      recordId: record.id,
      newBalance: Number(newBalance.toFixed(2)),
    };
  } catch (e) {
    await admin.from("recharge_records").delete().eq("id", record.id);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "余额入账失败",
    };
  }
}

/** 管理员将用户账户余额设为指定值 */
export async function setUserTotalBalance(
  userId: string,
  targetBalance: number
): Promise<number> {
  const previousBalance = await getUserTotalBalance(userId);
  const newBalance = await setProfileBalance(userId, targetBalance);

  const delta = Number((newBalance - previousBalance).toFixed(4));
  if (delta !== 0) {
    const admin = createAdminClient();
    const { error: logErr } = await admin.from("balance_adjustment_logs").insert({
      user_id: userId,
      previous_balance: previousBalance,
      new_balance: newBalance,
      delta,
    });
    if (logErr) {
      throw new Error(`余额已更新，但收入记录写入失败: ${logErr.message}`);
    }
  }

  return newBalance;
}
