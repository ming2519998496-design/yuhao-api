import {
  getAdminEmailSet,
  hasTooManyAdminEmailsInEnv,
  MAX_ADMIN_ACCOUNTS,
} from "@/lib/admin-policy";

export { hasTooManyAdminEmailsInEnv };
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
import type { User } from "@supabase/supabase-js";

export { MAX_ADMIN_ACCOUNTS, getAdminEmailSet };

export async function getSessionUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function isUserAdmin(user: User): Promise<boolean> {
  const adminEmails = getAdminEmailSet();
  if (!user.email || !adminEmails.has(user.email.toLowerCase())) {
    return false;
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "admin";
}

/** 将 profiles 中的管理员与 ADMIN_EMAILS 白名单对齐，并保证不超过 2 人 */
export async function enforceAdminAllowlist(): Promise<void> {
  const allowed = getAdminEmailSet();
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: admins } = await admin
    .from("profiles")
    .select("id, email")
    .eq("role", "admin");

  for (const row of admins ?? []) {
    const email = row.email?.toLowerCase() ?? "";
    if (!allowed.has(email)) {
      await admin
        .from("profiles")
        .update({ role: "user", updated_at: now })
        .eq("id", row.id);
    }
  }

  for (const email of allowed) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) >= MAX_ADMIN_ACCOUNTS) break;

    const { data: profile } = await admin
      .from("profiles")
      .select("id, role")
      .ilike("email", email)
      .maybeSingle();

    if (!profile || profile.role === "admin") continue;

    await admin
      .from("profiles")
      .update({ role: "admin", updated_at: now })
      .eq("id", profile.id);
  }
}

/** 当前 profiles 中 role=admin 的人数 */
export async function countAdminProfiles(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return count ?? 0;
}

/** 服务端 API：要求已登录且为管理员 */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) {
    return { error: "未登录", status: 401 as const, user: null };
  }
  const ok = await isUserAdmin(user);
  if (!ok) {
    return { error: "无管理员权限", status: 403 as const, user: null };
  }
  return { error: null, status: 200 as const, user };
}

/** 登录后同步：白名单邮箱提升为 admin（全站最多 2 个） */
export async function syncAdminRole(user: User) {
  if (hasTooManyAdminEmailsInEnv()) return;

  const adminEmails = getAdminEmailSet();
  if (!user.email || !adminEmails.has(user.email.toLowerCase())) return;

  const admin = createAdminClient();
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  const { data: existing } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.role !== "admin" && (count ?? 0) >= MAX_ADMIN_ACCOUNTS) {
    return;
  }

  await admin.from("profiles").upsert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name ?? "",
    role: "admin",
    updated_at: new Date().toISOString(),
  });

  await enforceAdminAllowlist();
}
