import { getClientIp, normalizeIpForBucket } from "@/lib/client-ip";
import {
  consumeRateLimit,
  rateLimit429Response,
  REGISTER_RATE_LIMITS,
} from "@/lib/rate-limit";
import { sendResendAuthEmail } from "@/lib/resend-auth-email";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

const GENERIC_SENT_MESSAGE =
  "若该邮箱已注册，验证码已发送，请查收邮件（含垃圾箱）";

/**
 * 找回密码发验证码：Supabase Admin 生成 recovery OTP，Resend 直连发信。
 * 统一成功文案，避免泄露邮箱是否已注册。
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

  const clientIp = normalizeIpForBucket(getClientIp(request));
  const otpLimit = await consumeRateLimit({
    bucketKey: `forgot:otp:ip:${clientIp}`,
    max: REGISTER_RATE_LIMITS.otpPerIpPerHour,
    windowSeconds: 3600,
  });
  if (!otpLimit.allowed) {
    return rateLimit429Response(
      otpLimit.retryAfterSec,
      "发送验证码过于频繁，请稍后再试"
    );
  }

  const emailLimit = await consumeRateLimit({
    bucketKey: `forgot:otp:email:${email}`,
    max: 5,
    windowSeconds: 3600,
  });
  if (!emailLimit.allowed) {
    return rateLimit429Response(
      emailLimit.retryAfterSec,
      "发送验证码过于频繁，请稍后再试"
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    const notFound =
      msg.includes("user not found") ||
      msg.includes("not found") ||
      msg.includes("不存在");
    if (notFound) {
      return NextResponse.json({ success: true, message: GENERIC_SENT_MESSAGE });
    }
    console.error("[forgot-password] generateLink:", error.message);
    return NextResponse.json({ error: "发送失败，请稍后重试" }, { status: 500 });
  }

  const otp = data?.properties?.email_otp;
  if (!otp) {
    return NextResponse.json({ error: "发送失败，请稍后重试" }, { status: 500 });
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
    console.error("[forgot-password] resend:", result.message);
    return NextResponse.json({ error: "发送失败，请稍后重试" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    email,
    forwardedTo,
    message: forwardedTo
      ? `验证码已转发至 ${forwardedTo}（开发环境）`
      : GENERIC_SENT_MESSAGE,
  });
}
