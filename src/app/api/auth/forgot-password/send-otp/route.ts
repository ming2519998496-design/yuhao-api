import { getAuthErrorMessage } from "@/lib/auth-errors";
import { sendResendAuthEmail } from "@/lib/resend-auth-email";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/**
 * 找回密码发验证码：Supabase Admin 生成 recovery OTP，Resend 直连发信（不依赖 Send Email Hook）。
 */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求体" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "请输入有效邮箱" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error) {
    const message = getAuthErrorMessage(error);
    const notFound =
      message.toLowerCase().includes("user not found") ||
      message.includes("未找到") ||
      message.includes("不存在");
    return NextResponse.json(
      { error: notFound ? "该邮箱未注册，请检查或前往注册" : message },
      { status: notFound ? 400 : 500 }
    );
  }

  const otp = data?.properties?.email_otp;
  if (!otp) {
    return NextResponse.json({ error: "未能生成邮箱验证码" }, { status: 500 });
  }

  let result = await sendResendAuthEmail({
    to: email,
    action: "forgot_password",
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
        action: "forgot_password",
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
      ? `验证码已转发至 ${forwardedTo}（${email} 暂无法直收 Resend 测试邮件）`
      : `验证码已发送至 ${email}，请查收邮件（含垃圾箱）`,
  });
}
