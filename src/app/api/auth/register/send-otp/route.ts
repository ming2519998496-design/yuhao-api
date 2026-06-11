import { getAuthErrorMessage } from "@/lib/auth-errors";
import { sendResendAuthEmail } from "@/lib/resend-auth-email";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/**
 * 注册发验证码：经 Supabase Admin 生成 OTP，Resend 直连发信（不依赖 Send Email Hook）。
 * 验证码始终发往用户填写的注册邮箱；需在 Resend 验证发信域名。
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

  const result = await sendResendAuthEmail({
    to: email,
    action: "signup",
    token: otp,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    email,
    message: `验证码已发送至 ${email}，请查收邮件（含垃圾箱）`,
  });
}
