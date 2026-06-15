/**
 * 浏览器安全响应头（安全扫描 / 最佳实践）
 * 在 next.config.ts 中通过 headers() 应用到全站。
 */

const cspDirectives = [
  "default-src 'self'",
  // Next.js 构建产物；开发模式可能需要 unsafe-eval
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Tailwind / Next.js 内联样式
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

export const CONTENT_SECURITY_POLICY = cspDirectives.join("; ");

export const SECURITY_RESPONSE_HEADERS: { key: string; value: string }[] = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
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
