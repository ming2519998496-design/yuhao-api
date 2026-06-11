const FROM =
  process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
const FROM_NAME = process.env.RESEND_FROM_NAME?.trim() || "遇好API";

/** Resend 未验证域名时，仅允许发往账户注册邮箱 */
export function isResendTestingRecipientError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("only send testing emails") ||
    m.includes("verify a domain at resend.com")
  );
}

export function formatResendError(message: string, to?: string): string {
  if (isResendTestingRecipientError(message)) {
    const allowed =
      message.match(
        /own email address \(([^)]+)\)/i
      )?.[1] ?? "你在 Resend 注册时使用的邮箱";
    return (
      `暂时无法向 ${to ?? "该邮箱"} 发送验证码。\n` +
      "请在 Resend 验证发信域名（如 yuhaoapi.com），并在环境变量设置 RESEND_FROM_EMAIL=noreply@yuhaoapi.com 后重新部署。\n" +
      `（Resend 测试模式仅允许发往 ${allowed}。）`
    );
  }
  return message;
}

const SUBJECTS: Record<string, string> = {
  signup: "遇好API 注册验证码",
  recovery: "遇好API 修改密码验证码",
  reauthentication: "遇好API 修改密码验证码",
  magic_link: "遇好API 验证码",
  email_change: "遇好API 更换邮箱验证码",
  email_change_new: "遇好API 新邮箱验证码",
  invite: "遇好API 邀请",
};

function buildBody(action: string, token: string, tokenNew?: string): string {
  const lines = [
    "您好，",
    "",
    action === "signup"
      ? "您的注册验证码是："
      : action === "recovery" || action === "reauthentication"
        ? "您的修改密码验证码是："
        : "您的验证码是：",
    "",
    token,
    "",
  ];
  if (tokenNew) {
    lines.push("新邮箱验证码：", tokenNew, "");
  }
  lines.push("请在 5 分钟内使用（一般为 6 或 8 位数字）。如非本人操作请忽略。", "", "— 遇好API");
  return lines.join("\n");
}

export async function sendResendAuthEmail(params: {
  to: string;
  action: string;
  token: string;
  tokenNew?: string;
  /** 开发转发：说明验证码实际用于哪个邮箱账户 */
  forwardForEmail?: string;
}): Promise<
  | { ok: true }
  | { ok: false; message: string; testingRestriction?: boolean }
> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "未配置 RESEND_API_KEY" };
  }

  const subject = SUBJECTS[params.action] ?? "遇好API 验证码";
  let text = buildBody(params.action, params.token, params.tokenNew);
  if (params.forwardForEmail) {
    text =
      `【开发转发】以下验证码用于账户 ${params.forwardForEmail} 的操作，请在该账户的改密页面填写。\n\n` +
      text;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM}>`,
      to: [params.to],
      subject,
      text,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    message?: string;
    id?: string;
  };

  if (!res.ok) {
    const raw = body.message ?? `Resend API ${res.status}`;
    return {
      ok: false,
      message: formatResendError(raw, params.forwardForEmail ?? params.to),
      testingRestriction: isResendTestingRecipientError(raw),
    };
  }

  return { ok: true };
}

/** 发送纯文本邮件（登录提醒等） */
export async function sendResendPlainEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<
  | { ok: true }
  | { ok: false; message: string; testingRestriction?: boolean }
> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "未配置 RESEND_API_KEY" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM}>`,
      to: [params.to],
      subject: params.subject,
      text: params.text,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    const raw = body.message ?? `Resend API ${res.status}`;
    return {
      ok: false,
      message: formatResendError(raw, params.to),
      testingRestriction: isResendTestingRecipientError(raw),
    };
  }

  return { ok: true };
}
