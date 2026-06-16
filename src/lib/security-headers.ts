/**
 * 浏览器安全响应头（安全扫描 / 最佳实践）
 * 页面 CSP 由 middleware 动态注入 nonce；API 路由不发送 CSP。
 */

export type CspOptions = {
  /** 每请求随机 nonce，供后续 Script 组件使用 */
  nonce?: string;
  isDev?: boolean;
};

export function buildContentSecurityPolicy(options: CspOptions = {}): string {
  const isDev = options.isDev ?? process.env.NODE_ENV === "development";
  const scriptParts = ["'self'"];

  if (options.nonce) {
    scriptParts.push(`'nonce-${options.nonce}'`);
  }

  if (isDev) {
    // 开发模式：Turbopack / HMR 仍需 inline 与 eval
    scriptParts.push("'unsafe-inline'", "'unsafe-eval'");
  } else {
    // 生产：去掉 unsafe-eval；Next.js 内联 bootstrap 暂保留 unsafe-inline
    scriptParts.push("'unsafe-inline'");
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptParts.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
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
