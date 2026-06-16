import { logBalanceAdjustment } from "@/lib/balance-adjustment-log";
import { SIGNUP_TRIAL_BONUS_YUAN } from "@/lib/referral-program";
import { createAdminClient } from "@/lib/supabase-admin";
import { creditUserBalance, getUserTotalBalance } from "@/lib/user-balance";

function isMissingSignupBonusColumn(message: string) {
  return (
    message.includes("signup_bonus_granted_at") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

async function hasSignupBonusLog(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("balance_adjustment_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", "signup");

  if (error) {
    if (/kind|column.*does not exist/i.test(error.message)) return false;
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}

/** 新用户注册体验金（幂等，每位用户仅发放一次） */
export async function grantSignupTrialBonus(
  userId: string,
  options?: { userCreatedAt?: string | null; role?: string | null }
): Promise<{ granted: boolean; balance?: number }> {
  if (options?.role === "admin") {
    return { granted: false };
  }

  const admin = createAdminClient();
  let role = options?.role ?? null;
  let createdAt = options?.userCreatedAt ?? null;
  let bonusGrantedAt: string | null | undefined;
  let hasBonusColumn = true;

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("signup_bonus_granted_at, role, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    if (!isMissingSignupBonusColumn(profileErr.message)) {
      throw new Error(profileErr.message);
    }
    hasBonusColumn = false;
    const { data: fallback, error: fallbackErr } = await admin
      .from("profiles")
      .select("role, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (fallbackErr) throw new Error(fallbackErr.message);
    role = fallback?.role ?? role;
    createdAt = fallback?.created_at ?? createdAt;
  } else {
    role = profile?.role ?? role;
    createdAt = profile?.created_at ?? createdAt;
    bonusGrantedAt = profile?.signup_bonus_granted_at;
  }

  if (role === "admin") {
    return { granted: false };
  }

  if (bonusGrantedAt) {
    return { granted: false };
  }

  if (!hasBonusColumn && (await hasSignupBonusLog(userId))) {
    return { granted: false };
  }

  if (createdAt) {
    const createdMs = Date.parse(createdAt);
    if (!Number.isNaN(createdMs)) {
      const ageMs = Date.now() - createdMs;
      if (ageMs > 7 * 24 * 60 * 60 * 1000) {
        return { granted: false };
      }
    }
  }

  if (hasBonusColumn) {
    const now = new Date().toISOString();
    const { data: claimed, error: claimErr } = await admin
      .from("profiles")
      .update({ signup_bonus_granted_at: now })
      .eq("id", userId)
      .is("signup_bonus_granted_at", null)
      .select("id")
      .maybeSingle();

    if (claimErr) throw new Error(claimErr.message);
    if (!claimed) return { granted: false };
  } else if (await hasSignupBonusLog(userId)) {
    return { granted: false };
  }

  const previousBalance = await getUserTotalBalance(userId);
  const newBalance = await creditUserBalance(userId, SIGNUP_TRIAL_BONUS_YUAN);

  try {
    await logBalanceAdjustment({
      userId,
      previousBalance,
      newBalance,
      kind: "signup",
    });
  } catch (e) {
    console.error("[signup-bonus] log failed:", e);
  }

  return { granted: true, balance: newBalance };
}
