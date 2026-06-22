import { normalizeIpForBucket } from "@/lib/client-ip";
import { logBalanceAdjustment } from "@/lib/balance-adjustment-log";
import { SIGNUP_BONUS_LIMITS } from "@/lib/rate-limit";
import { SIGNUP_TRIAL_BONUS_YUAN } from "@/lib/referral-program";
import { createAdminClient } from "@/lib/supabase-admin";
import { creditUserBalance, getUserTotalBalance } from "@/lib/user-balance";

function isMissingSignupBonusColumn(message: string) {
  return (
    message.includes("signup_bonus_granted_at") ||
    message.includes("signup_ip") ||
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

async function countRecentSignupBonusesForIp(ip: string): Promise<number | null> {
  if (ip === "unknown") return null;

  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("signup_ip", ip)
    .not("signup_bonus_granted_at", "is", null)
    .gte("signup_bonus_granted_at", since);

  if (error) {
    if (isMissingSignupBonusColumn(error.message)) return null;
    throw new Error(error.message);
  }

  return count ?? 0;
}

/** 新用户注册体验金（幂等，每位用户仅发放一次） */
export async function grantSignupTrialBonus(
  userId: string,
  options?: {
    userCreatedAt?: string | null;
    role?: string | null;
    clientIp?: string | null;
  }
): Promise<{ granted: boolean; balance?: number }> {
  if (options?.role === "admin") {
    return { granted: false };
  }

  const signupIp = normalizeIpForBucket(options?.clientIp ?? "unknown");

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

  const ipBonusCount = await countRecentSignupBonusesForIp(signupIp);
  if (
    ipBonusCount != null &&
    ipBonusCount >= SIGNUP_BONUS_LIMITS.maxPerIpPerDay
  ) {
    console.warn(
      `[signup-bonus] IP limit reached (${signupIp}, count=${ipBonusCount})`
    );
    return { granted: false };
  }

  if (hasBonusColumn) {
    const now = new Date().toISOString();
    const patch: Record<string, string> = { signup_bonus_granted_at: now };
    if (signupIp !== "unknown") {
      patch.signup_ip = signupIp;
    }

    const { data: claimed, error: claimErr } = await admin
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .is("signup_bonus_granted_at", null)
      .select("id")
      .maybeSingle();

    if (claimErr) {
      if (isMissingSignupBonusColumn(claimErr.message)) {
        const { data: claimedFallback, error: fallbackClaimErr } = await admin
          .from("profiles")
          .update({ signup_bonus_granted_at: now })
          .eq("id", userId)
          .is("signup_bonus_granted_at", null)
          .select("id")
          .maybeSingle();
        if (fallbackClaimErr) throw new Error(fallbackClaimErr.message);
        if (!claimedFallback) return { granted: false };
      } else {
        throw new Error(claimErr.message);
      }
    } else if (!claimed) {
      return { granted: false };
    }
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
