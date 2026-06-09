import { getAdminEmailList } from "@/lib/admin-policy";
import { sendResendPlainEmail } from "@/lib/resend-auth-email";

export function isAdminLoginAlertEnabled(): boolean {
  const flag = process.env.ADMIN_LOGIN_ALERT?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return Boolean(process.env.RESEND_API_KEY);
}

function formatLoginTime(date: Date): string {
  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  });
}

function buildLoginAlertText(params: {
  adminEmail: string;
  ip: string;
  userAgent: string;
  at: Date;
}): string {
  return [
    "您好，",
    "",
    "检测到管理后台登录：",
    "",
    `登录账号：${params.adminEmail}`,
    `登录时间：${formatLoginTime(params.at)}（北京时间）`,
    `IP 地址：${params.ip}`,
    `设备信息：${params.userAgent}`,
    "",
    "如非本人操作，请立即修改密码并检查账户安全。",
    "",
    "— 遇好API 安全提醒",
  ].join("\n");
}

/** 管理员登录成功后，向 ADMIN_EMAILS 中的全部管理员邮箱发送提醒 */
export async function notifyAdminLogin(params: {
  adminEmail: string;
  ip?: string;
  userAgent?: string;
  at?: Date;
}): Promise<{ sent: number; failed: string[] }> {
  if (!isAdminLoginAlertEnabled()) {
    return { sent: 0, failed: [] };
  }

  const recipients = getAdminEmailList();
  if (!recipients.length) {
    return { sent: 0, failed: [] };
  }

  const at = params.at ?? new Date();
  const ip = params.ip?.trim() || "未知";
  const userAgent = params.userAgent?.trim() || "未知";
  const subject = "【遇好API】管理后台登录提醒";
  const text = buildLoginAlertText({
    adminEmail: params.adminEmail,
    ip,
    userAgent,
    at,
  });

  let sent = 0;
  const failed: string[] = [];

  for (const to of recipients) {
    const result = await sendResendPlainEmail({ to, subject, text });
    if (result.ok) {
      sent += 1;
    } else {
      failed.push(`${to}: ${result.message}`);
    }
  }

  return { sent, failed };
}

export function getRequestClientMeta(request: Request): {
  ip: string;
  userAgent: string;
} {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "未知";
  const userAgent = request.headers.get("user-agent")?.trim() || "未知";
  return { ip, userAgent };
}
