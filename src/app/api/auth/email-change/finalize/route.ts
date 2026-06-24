import { requireActiveUserResponse } from "@/lib/session-api";
import { sendResendPlainEmail } from "@/lib/resend-auth-email";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/**
 * 邮箱更换成功后：通知原邮箱、撤销其他登录会话（保留当前会话）。
 */
export async function POST(request: Request) {
  const auth = await requireActiveUserResponse();
  if (auth.response) return auth.response;
  const user = auth.user;

  let body: { previousEmail?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const previousEmail = body.previousEmail?.trim().toLowerCase();
  const currentEmail = user.email?.trim().toLowerCase();

  if (
    previousEmail &&
    currentEmail &&
    previousEmail !== currentEmail &&
    previousEmail.includes("@")
  ) {
    const notify = await sendResendPlainEmail({
      to: previousEmail,
      subject: "遇好API 登录邮箱已变更",
      text: [
        "您好，",
        "",
        `您的遇好API账户登录邮箱已变更为：${user.email}`,
        "",
        "如非本人操作，请立即联系客服并修改密码。",
        "",
        "— 遇好API",
      ].join("\n"),
    });
    if (!notify.ok) {
      console.warn("[email-change] notify previous email failed:", notify.message);
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.signOut(user.id, "others");
  if (error) {
    console.warn("[email-change] signOut others failed:", error.message);
  }

  return NextResponse.json({ success: true });
}
