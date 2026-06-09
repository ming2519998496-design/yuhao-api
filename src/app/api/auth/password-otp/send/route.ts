import { getSessionUser } from "@/lib/auth-admin";
import { sendResendAuthEmail } from "@/lib/resend-auth-email";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/**
 * 已登录用户修改密码：生成 recovery OTP 并通过 Resend 发信。
 * Resend 未验证域名时，可配置 RESEND_DEV_OTP_FORWARD_TO 将验证码转发到 Gmail。
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user?.email) {
    return NextResponse.json({ error: "未登录或未绑定邮箱" }, { status: 401 });
  }

  const email = user.email;
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "生成验证码失败" },
      { status: 500 }
    );
  }

  const otp = data?.properties?.email_otp;
  if (!otp) {
    return NextResponse.json({ error: "未能生成邮箱验证码" }, { status: 500 });
  }

  let result = await sendResendAuthEmail({
    to: email,
    action: "recovery",
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
        action: "recovery",
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
      ? `验证码已转发至 ${forwardedTo}（原绑定邮箱 ${email} 暂无法直收 Resend 测试邮件）`
      : `验证码已发送至 ${email}`,
  });
}
