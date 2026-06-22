/** 从 Vercel / Cloudflare 代理头解析客户端 IP */
export function getClientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const forwarded = request.headers.get("x-forwarded-for");
  const fromForwarded = forwarded?.split(",")[0]?.trim();
  if (fromForwarded) return fromForwarded;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

export function normalizeIpForBucket(ip: string): string {
  const trimmed = ip.trim().toLowerCase();
  if (!trimmed || trimmed === "unknown") return "unknown";
  return trimmed.replace(/[^a-f0-9.:]/gi, "").slice(0, 64) || "unknown";
}
