import { matchAllowedOrigin } from "@/lib/cors";
import { getClientIp, normalizeIpForBucket } from "@/lib/client-ip";
import {
  consumeRateLimit,
  rateLimit429Response,
  type RateLimitResult,
} from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { NextResponse } from "next/server";

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** 公开目录 / 模型列表限流 */
export const CATALOG_RATE_LIMITS = {
  perIpPerMinute: readIntEnv("CATALOG_RATE_LIMIT_PER_IP_MINUTE", 30),
  perIpPerHour: readIntEnv("CATALOG_RATE_LIMIT_PER_IP_HOUR", 200),
  botPerIpPerMinute: readIntEnv("CATALOG_BOT_RATE_LIMIT_PER_IP_MINUTE", 5),
  botPerIpPerHour: readIntEnv("CATALOG_BOT_RATE_LIMIT_PER_IP_HOUR", 30),
};

/** 网站 /chat Web API 限流（严于 v1 API） */
export const WEB_CHAT_RATE_LIMITS = {
  perUserPerMinute: readIntEnv("WEB_CHAT_RATE_LIMIT_PER_USER_MINUTE", 20),
  perIpPerMinute: readIntEnv("WEB_CHAT_RATE_LIMIT_PER_IP_MINUTE", 30),
  perUserPerHour: readIntEnv("WEB_CHAT_RATE_LIMIT_PER_USER_HOUR", 200),
};

/** API Key 暴力猜测限流 */
export const API_KEY_AUTH_FAIL_LIMITS = {
  perIpPerMinute: readIntEnv("API_KEY_FAIL_RATE_LIMIT_PER_IP_MINUTE", 10),
  perIpPerHour: readIntEnv("API_KEY_FAIL_RATE_LIMIT_PER_IP_HOUR", 60),
};

const BOT_UA_PATTERNS = [
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /python-urllib/i,
  /scrapy/i,
  /httpclient/i,
  /go-http-client/i,
  /java\//i,
  /libwww-perl/i,
  /postman/i,
  /insomnia/i,
  /headlesschrome/i,
  /puppeteer/i,
  /playwright/i,
  /phantomjs/i,
  /selenium/i,
  /bytespider/i,
  /petalbot/i,
  /gptbot/i,
  /claudebot/i,
  /ahrefsbot/i,
  /semrushbot/i,
];

export function isLikelyAutomatedClient(request: Request): boolean {
  const ua = request.headers.get("user-agent")?.trim() ?? "";
  if (!ua) return true;
  return BOT_UA_PATTERNS.some((pattern) => pattern.test(ua));
}

/** Web API 须来自本站浏览器（防跨站脚本盗 Session 刷 /chat） */
export function assertBrowserWebRequest(
  request: Request
): { ok: true } | { ok: false; response: NextResponse } {
  if (process.env.NODE_ENV === "development") {
    return { ok: true };
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") {
    return { ok: true };
  }

  const origin = matchAllowedOrigin(request.headers.get("origin"));
  if (origin) return { ok: true };

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (matchAllowedOrigin(refOrigin)) return { ok: true };
    } catch {
      /* ignore */
    }
  }

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: {
          message: "请通过遇好API 网站使用此功能",
          type: "forbidden_error",
          code: "web_origin_required",
        },
      },
      { status: 403 }
    ),
  };
}

export async function enforcePublicCatalogAccess(
  request: Request
): Promise<RateLimitResult> {
  const ip = normalizeIpForBucket(getClientIp(request));
  const automated = isLikelyAutomatedClient(request);
  const checks = [
    {
      bucketKey: `catalog:ip:${ip}:m`,
      max: automated
        ? CATALOG_RATE_LIMITS.botPerIpPerMinute
        : CATALOG_RATE_LIMITS.perIpPerMinute,
      windowSeconds: 60,
    },
    {
      bucketKey: `catalog:ip:${ip}:h`,
      max: automated
        ? CATALOG_RATE_LIMITS.botPerIpPerHour
        : CATALOG_RATE_LIMITS.perIpPerHour,
      windowSeconds: 3600,
    },
  ];

  for (const check of checks) {
    const result = await consumeRateLimit(check);
    if (!result.allowed) return result;
  }
  return { allowed: true };
}

export async function enforceWebChatRateLimits(params: {
  userId: string;
  clientIp: string;
}): Promise<RateLimitResult> {
  const ip = normalizeIpForBucket(params.clientIp);
  const checks = [
    {
      bucketKey: `webchat:user:${params.userId}:m`,
      max: WEB_CHAT_RATE_LIMITS.perUserPerMinute,
      windowSeconds: 60,
    },
    {
      bucketKey: `webchat:ip:${ip}:m`,
      max: WEB_CHAT_RATE_LIMITS.perIpPerMinute,
      windowSeconds: 60,
    },
    {
      bucketKey: `webchat:user:${params.userId}:h`,
      max: WEB_CHAT_RATE_LIMITS.perUserPerHour,
      windowSeconds: 3600,
    },
  ];

  for (const check of checks) {
    const result = await consumeRateLimit(check);
    if (!result.allowed) return result;
  }
  return { allowed: true };
}

export async function enforceApiKeyAuthAllowed(
  request: Request
): Promise<RateLimitResult> {
  const ip = normalizeIpForBucket(getClientIp(request));
  const checks = [
    {
      bucketKey: `apikey:fail:ip:${ip}:m`,
      max: API_KEY_AUTH_FAIL_LIMITS.perIpPerMinute,
      windowSeconds: 60,
    },
    {
      bucketKey: `apikey:fail:ip:${ip}:h`,
      max: API_KEY_AUTH_FAIL_LIMITS.perIpPerHour,
      windowSeconds: 3600,
    },
  ];

  for (const check of checks) {
    const result = await consumeRateLimit(check);
    if (!result.allowed) return result;
  }
  return { allowed: true };
}

export async function recordFailedApiKeyAttempt(request: Request): Promise<void> {
  const ip = normalizeIpForBucket(getClientIp(request));
  await consumeRateLimit({
    bucketKey: `apikey:fail:ip:${ip}:m`,
    max: API_KEY_AUTH_FAIL_LIMITS.perIpPerMinute,
    windowSeconds: 60,
  });
  await consumeRateLimit({
    bucketKey: `apikey:fail:ip:${ip}:h`,
    max: API_KEY_AUTH_FAIL_LIMITS.perIpPerHour,
    windowSeconds: 3600,
  });
}

export function catalogRateLimitResponse(retryAfterSec: number): NextResponse {
  return rateLimit429Response(
    retryAfterSec,
    "模型目录访问过于频繁，请稍后再试"
  ) as NextResponse;
}

export function webChatRateLimitResponse(retryAfterSec: number): NextResponse {
  return rateLimit429Response(
    retryAfterSec,
    "对话请求过于频繁，请稍后再试"
  ) as NextResponse;
}

export function apiKeyAuthRateLimitResponse(retryAfterSec: number): NextResponse {
  return rateLimit429Response(
    retryAfterSec,
    "API Key 验证尝试过于频繁，请稍后再试"
  ) as NextResponse;
}

/** Web 对话 / 生成 / 历史：来源校验 + 可选 Turnstile + 专用限流 */
export async function guardWebApiRequest(
  request: Request,
  options: {
    userId: string;
    turnstileToken?: string | null;
  }
): Promise<NextResponse | null> {
  const origin = assertBrowserWebRequest(request);
  if (!origin.ok) return origin.response;

  const turnstile = await verifyTurnstileToken(
    options.turnstileToken,
    request
  );
  if (!turnstile.ok) {
    return NextResponse.json(
      { error: { message: turnstile.message, type: "forbidden_error" } },
      { status: 403 }
    );
  }

  const rateLimit = await enforceWebChatRateLimits({
    userId: options.userId,
    clientIp: getClientIp(request),
  });
  if (!rateLimit.allowed) {
    return webChatRateLimitResponse(rateLimit.retryAfterSec);
  }

  return null;
}
