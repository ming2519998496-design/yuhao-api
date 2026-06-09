/** 从 Supabase Auth 错误对象提取可读文案 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error) return "未知错误，请稍后重试";

  if (typeof error === "string") {
    return formatAuthError(error);
  }

  const e = error as Record<string, unknown>;
  const candidates = [
    e.message,
    e.msg,
    e.error_description,
    typeof e.error === "string" ? e.error : null,
    typeof e.error === "object" && e.error !== null
      ? (e.error as Record<string, unknown>).message
      : null,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim() && c.trim() !== "{}") {
      return formatAuthError(c);
    }
  }

  const code = e.code ?? e.error_code ?? e.status;
  if (code === 504 || code === "504") {
    return "Supabase 请求超时（发邮件可能卡住）。请检查 SMTP 配置，或稍后再试；也可查看 Supabase Auth Logs。";
  }

  if (typeof code === "string" || typeof code === "number") {
    return `注册失败（${code}）。请查看 Supabase Authentication → Logs 或 Resend → Emails。`;
  }

  return "注册失败，请检查邮箱与 Supabase 邮件（SMTP）配置。详见 docs/fix-email-smtp-checklist.md";
}

/** 将 Supabase 英文错误转为更易理解的提示 */
export function formatAuthError(message: string): string {
  const trimmed = message.trim();
  if (!trimmed || trimmed === "{}") {
    return "服务器未返回具体原因，请查看 Supabase Auth Logs 与 Resend Emails。";
  }

  const m = trimmed.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "邮箱或密码错误，请重试";
  }
  if (m.includes("signups not allowed for otp")) {
    return "当前项目未开启 OTP 注册/登录。绑定手机请使用「获取验证码」；若仍失败，请在 Supabase → Authentication → Providers 中开启 Phone，并配置短信服务。";
  }
  if (
    m.includes("sms sending is not enabled") ||
    m.includes("unable to get sms provider")
  ) {
    return "未配置短信服务商。请在 Supabase Dashboard → Authentication → Providers → Phone 中填写 Twilio（或启用 Send SMS Hook 对接阿里云/腾讯云）。详见项目 docs/supabase-sms-providers.md";
  }
  if (m.includes("hook: 404") || m.includes("status code returned from hook")) {
    return "邮件 Hook 未连通。注册已改为 Resend 直连发信，请刷新页面后重试；若仍失败请检查 RESEND_API_KEY。";
  }
  if (
    m.includes("already been registered") ||
    m.includes("already registered") ||
    m.includes("user already registered")
  ) {
    return "该邮箱已注册，请直接登录";
  }
  if (m.includes("rate limit")) {
    return "操作过于频繁，请稍后再试。";
  }
  if (m.includes("upstream request timeout") || m.includes("timeout")) {
    return "Supabase 请求超时，发信可能卡住。请核对 Resend SMTP（Host/Port/Key），或稍后重试。";
  }
  if (
    m.includes("networkerror") ||
    m.includes("failed to fetch") ||
    m.includes("fetch failed") ||
    m.includes("could not resolve") ||
    m.includes("enotfound")
  ) {
    return (
      "无法连接 Supabase 认证服务。请依次检查：\n" +
      "1) 本地是否已运行 npm run dev（注意终端里显示的端口，可能是 3003 而非 3000）；\n" +
      "2) 浏览器能否打开 Supabase 项目（Dashboard 未暂停）；\n" +
      "3) 网络/VPN 是否可访问 supabase.co；\n" +
      "4) .env.local 中 NEXT_PUBLIC_SUPABASE_URL 与 PUBLISHABLE_KEY 是否正确，修改后需重启 dev。"
    );
  }
  if (m.includes("error sending confirmation email")) {
    return (
      "确认邮件发送失败（Supabase 无法通过 SMTP 发信）。请依次检查：\n" +
      "1) Authentication → Email → 已开启 Custom SMTP 且已保存；\n" +
      "2) Password 为 Resend API Key（re_ 开头），Username 为 resend，Port 465；\n" +
      "3) Sender email 用 onboarding@resend.dev（无域名时），收件邮箱需在 Resend 可接收；\n" +
      "4) Resend → Logs 与 Supabase → Authentication → Logs 查看具体 SMTP 报错。\n" +
      "详见 docs/fix-email-smtp-checklist.md"
    );
  }
  return trimmed;
}
