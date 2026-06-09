import { getSessionUser } from "@/lib/auth-admin";
import { ACCOUNT_FROZEN_MESSAGE } from "@/lib/account-frozen-messages";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
import type { User } from "@supabase/supabase-js";

export { ACCOUNT_FROZEN_MESSAGE } from "@/lib/account-frozen-messages";

function isMissingFrozenColumn(message?: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes("is_frozen") || m.includes("does not exist");
}

export async function isUserFrozen(userId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("is_frozen")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      if (isMissingFrozenColumn(error.message)) return false;
      throw error;
    }
    return data?.is_frozen === true;
  } catch {
    return false;
  }
}

/** 冻结账号并清除当前会话（用于登录 / sync-profile 拦截） */
export async function rejectFrozenSession(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
}

export type ActiveUserResult = {
  user: User | null;
  error: string | null;
  status: 200 | 401 | 403;
  frozen: boolean;
};

/** 要求已登录且账号未冻结 */
export async function requireActiveUser(): Promise<ActiveUserResult> {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, error: "未登录", status: 401, frozen: false };
  }

  if (await isUserFrozen(user.id)) {
    await rejectFrozenSession();
    return {
      user: null,
      error: ACCOUNT_FROZEN_MESSAGE,
      status: 403,
      frozen: true,
    };
  }

  return { user, error: null, status: 200, frozen: false };
}
