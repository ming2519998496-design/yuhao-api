/** 浏览器跨域 API 访问允许的来源（逗号分隔，可含本地与预览域） */
export function getAllowedOrigins(): string[] {
  const fromEnv = process.env.ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const origins = new Set<string>([
    "https://yuhaoapi.com",
    "https://www.yuhaoapi.com",
    ...(fromEnv ?? []),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) origins.add(siteUrl.replace(/\/$/, ""));

  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`);
  }

  if (process.env.NODE_ENV === "development") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
    origins.add("http://localhost:3003");
  }

  return [...origins];
}

export function matchAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const normalized = origin.replace(/\/$/, "");
  return getAllowedOrigins().includes(normalized) ? normalized : null;
}

export const CORS_ALLOW_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
export const CORS_ALLOW_HEADERS =
  "Content-Type, Authorization, X-Requested-With, Accept";
