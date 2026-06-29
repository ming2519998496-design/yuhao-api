/**
 * 浏览器安全响应头（安全扫描 / 最佳实践）
 * 页面 CSP 由 middleware 设置；API 路由不发送 CSP。
 */

export type CspOptions = {
  isDev?: boolean;
};

export function buildContentSecurityPolicy(options: CspOptions = {}): string {
  const isDev = options.isDev ?? process.env.NODE_ENV === "development";
  const scriptParts = ["'self'"];

  if (isDev) {
    // 开发模式：Turbopack / HMR 仍需 inline 与 eval
    scriptParts.push("'unsafe-inline'", "'unsafe-eval'");
  } else {
    // 生产：去掉 unsafe-eval；保留 unsafe-inline（Next.js 内联脚本尚未接 nonce）
    // 注意：script-src 含 nonce 时浏览器会忽略 unsafe-inline，会导致整站 JS 被拦、白屏
    scriptParts.push("'unsafe-inline'");
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptParts.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https: https://*.supabase.co",
    "media-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}

/** 不含 CSP，供 JSON API 响应使用 */
export const BASE_SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];
