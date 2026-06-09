import {
  enforceAdminAllowlist,
  getSessionUser,
  hasTooManyAdminEmailsInEnv,
  isUserAdmin,
  syncAdminRole,
} from "@/lib/auth-admin";
import {
  ACCOUNT_FROZEN_MESSAGE,
  isUserFrozen,
  rejectFrozenSession,
} from "@/lib/account-frozen";
import { getAdminEmailSet } from "@/lib/admin-policy";
import { bindReferrer, ensureAffCode } from "@/lib/referral";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

/** 登录后同步 profile 与管理员角色 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (await isUserFrozen(user.id)) {
    await rejectFrozenSession();
    return NextResponse.json(
      { error: ACCOUNT_FROZEN_MESSAGE, frozen: true },
      { status: 403 }
    );
  }

  let aff: string | undefined;
  try {
    const text = await request.text();
    if (text) {
      const body = JSON.parse(text) as { aff?: string };
      if (typeof body.aff === "string") aff = body.aff;
    }
  } catch {
    /* 无 body 或非法 JSON */
  }

  if (hasTooManyAdminEmailsInEnv()) {
    return NextResponse.json(
      { error: "ADMIN_EMAILS 最多配置 2 个管理员邮箱" },
      { status: 500 }
    );
  }

  const adminEmails = getAdminEmailSet();
  const isAdminByEmail =
    !!user.email && adminEmails.has(user.email.toLowerCase());

  const admin = createAdminClient();

  const role = isAdminByEmail ? "admin" : "user";

  await admin.from("profiles").upsert({
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    full_name: user.user_metadata?.full_name ?? "",
    role,
    updated_at: new Date().toISOString(),
  });

  if (isAdminByEmail) {
    await syncAdminRole(user);
  } else {
    await enforceAdminAllowlist();
  }

  try {
    await ensureAffCode(user.id);
    await bindReferrer(user.id, aff);
  } catch (e) {
    console.error("[sync-profile] referral setup:", e);
  }

  const isAdmin = await isUserAdmin(user);

  return NextResponse.json({ success: true, isAdmin, email: user.email });
}
