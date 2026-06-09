import { ACCOUNT_FROZEN_MESSAGE, isUserFrozen, rejectFrozenSession } from "@/lib/account-frozen";
import {
  getRequestClientMeta,
  notifyAdminLogin,
} from "@/lib/admin-login-alert";
import {
  enforceAdminAllowlist,
  hasTooManyAdminEmailsInEnv,
  isUserAdmin,
  syncAdminRole,
} from "@/lib/auth-admin";
import { getAdminEmailSet } from "@/lib/admin-policy";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { bindReferrer, ensureAffCode } from "@/lib/referral";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

/** 服务端登录：浏览器只请求本站，由 Next.js 连接 Supabase（避免浏览器 NetworkError） */
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; aff?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: "请填写邮箱和密码" }, { status: 400 });
  }

  if (hasTooManyAdminEmailsInEnv()) {
    return NextResponse.json(
      { error: "ADMIN_EMAILS 最多配置 2 个管理员邮箱" },
      { status: 500 }
    );
  }

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: getAuthErrorMessage(error) },
        { status: 401 }
      );
    }

    const user = data.user;
    if (!user) {
      return NextResponse.json({ error: "登录失败，请重试" }, { status: 401 });
    }

    if (await isUserFrozen(user.id)) {
      await rejectFrozenSession();
      return NextResponse.json(
        { error: ACCOUNT_FROZEN_MESSAGE, frozen: true },
        { status: 403 }
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
      if (typeof body.aff === "string") {
        await bindReferrer(user.id, body.aff);
      }
    } catch (e) {
      console.error("[login] referral setup:", e);
    }

    const isAdmin = await isUserAdmin(user);

    if (isAdmin && user.email) {
      const { ip, userAgent } = getRequestClientMeta(request);
      void notifyAdminLogin({
        adminEmail: user.email,
        ip,
        userAgent,
      }).then(({ sent, failed }) => {
        if (failed.length) {
          console.warn("[login] admin login alert partial failure:", failed);
        } else if (sent > 0) {
          console.info(`[login] admin login alert sent to ${sent} recipient(s)`);
        }
      });
    }

    return NextResponse.json({
      success: true,
      isAdmin,
      email: user.email,
    });
  } catch (e) {
    console.error("[login]", e);
    return NextResponse.json(
      {
        error: getAuthErrorMessage(e),
      },
      { status: 503 }
    );
  }
}
