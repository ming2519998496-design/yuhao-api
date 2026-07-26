import { getAuthErrorMessage } from "@/lib/auth-errors";
import { getClientIp, normalizeIpForBucket } from "@/lib/client-ip";
import { formatPhoneE164, isValidChinaMobile, maskPhone } from "@/lib/phone";
import {
  consumeRateLimit,
  rateLimit429Response,
  REGISTER_RATE_LIMITS,
} from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase-admin";
import { isPhoneAuthEnabled } from "@/lib/phone-auth-feature";
import { NextResponse } from "next/server";

/** 手机号注册发验证码：暂未开放时直接拒绝 */
export async function POST(request: Request) {
  if (!isPhoneAuthEnabled()) {
    return NextResponse.json(
      { error: "手机号注册暂未开放，请使用邮箱注册" },
      { status: 403 }
    );
  }

  let body: { phone?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求体" }, { status: 400 });
  }

  const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const phone = formatPhoneE164(phoneRaw);

  if (!isValidChinaMobile(phoneRaw)) {
    return NextResponse.json({ error: "请输入有效的中国大陆手机号" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "密码至少 8 位" }, { status: 400 });
  }

  const clientIp = normalizeIpForBucket(getClientIp(request));
  const otpLimit = await consumeRateLimit({
    bucketKey: `register:phone-otp:ip:${clientIp}`,
    max: REGISTER_RATE_LIMITS.otpPerIpPerHour,
    windowSeconds: 3600,
  });
  if (!otpLimit.allowed) {
    return rateLimit429Response(
      otpLimit.retryAfterSec,
      "发送验证码过于频繁，请稍后再试"
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.signUp({ phone, password });

  if (error) {
    const message = getAuthErrorMessage(error);
    const lower = message.toLowerCase();

    if (
      lower.includes("already") ||
      lower.includes("已注册") ||
      lower.includes("exists")
    ) {
      const { error: resendError } = await admin.auth.resend({
        type: "sms",
        phone,
      });
      if (!resendError) {
        return NextResponse.json({
          success: true,
          phone,
          message: `验证码已发送至 ${maskPhone(phone)}`,
        });
      }
      return NextResponse.json({ error: "该手机号已注册，请直接登录" }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    phone,
    message: `验证码已发送至 ${maskPhone(phone)}`,
  });
}
