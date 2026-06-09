import { getAuthErrorMessage } from "@/lib/auth-errors";
import { sendResendAuthEmail } from "@/lib/resend-auth-email";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/**
 * 注册发验证码：经 Supabase Admin 生成 OTP，Resend 直连发信（不依赖 Send Email Hook）。
 * 开发阶段可配置 RESEND_DEV_OTP_FORWARD_TO 将验证码转发到 Gmail。
 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求体" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "请输入有效邮箱" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "密码至少 8 位" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
  });

  if (error) {
    const message = getAuthErrorMessage(error);
    const status = message.includes("已注册") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const otp = data?.properties?.email_otp;
  if (!otp) {
    return NextResponse.json({ error: "未能生成邮箱验证码" }, { status: 500 });
  }

  let result = await sendResendAuthEmail({
    to: email,
    action: "signup",
    token: otp,
  });

  let forwardedTo: string | undefined;

  if (!result.ok && result.testingRestriction) {
    const forwardTo =
      process.env.RESEND_DEV_OTP_FORWARD_TO?.trim() ||
      process.env.TEST_EMAIL_TO?.trim();

    if (forwardTo) {
      result = await sendResendAuthEmail({
        to: forwardTo,
        action: "signup",
        token: otp,
        forwardForEmail: email,
      });
      if (result.ok) {
        forwardedTo = forwardTo;
      }
    }
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    email,
    forwardedTo,
    message: forwardedTo
      ? `验证码已转发至 ${forwardedTo}（注册邮箱 ${email} 暂无法直收 Resend 测试邮件，请在转发邮件中查看验证码）`
      : `验证码已发送至 ${email}`,
  });
}
