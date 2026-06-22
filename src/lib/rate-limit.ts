import { createAdminClient } from "@/lib/supabase-admin";

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

type MemoryBucket = {
  windowStartMs: number;
  count: number;
};

const memoryBuckets = new Map<string, MemoryBucket>();

function isMissingRateLimitRpc(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("consume_rate_limit") ||
    m.includes("rate_limit_buckets") ||
    m.includes("does not exist") ||
    m.includes("schema cache")
  );
}

function consumeMemoryRateLimit(
  bucketKey: string,
  max: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = memoryBuckets.get(bucketKey);

  if (!existing || now - existing.windowStartMs >= windowMs) {
    memoryBuckets.set(bucketKey, { windowStartMs: now, count: 1 });
    return { allowed: true };
  }

  if (existing.count >= max) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((existing.windowStartMs + windowMs - now) / 1000)
    );
    return { allowed: false, retryAfterSec };
  }

  existing.count += 1;
  return { allowed: true };
}

/** 固定窗口限流；优先 Supabase RPC，未迁移时降级为进程内计数 */
export async function consumeRateLimit(params: {
  bucketKey: string;
  max: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const max = Math.max(0, Math.floor(params.max));
  const windowSeconds = Math.max(1, Math.floor(params.windowSeconds));
  if (max <= 0) return { allowed: true };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_bucket: params.bucketKey.slice(0, 200),
    p_max: max,
    p_window_seconds: windowSeconds,
  });

  if (!error && data && Array.isArray(data) && data[0]) {
    const row = data[0] as {
      allowed?: boolean;
      retry_after_seconds?: number;
    };
    if (row.allowed === false) {
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Number(row.retry_after_seconds) || 1),
      };
    }
    return { allowed: true };
  }

  if (error && !isMissingRateLimitRpc(error.message)) {
    console.error("[rate-limit] rpc failed:", error.message);
  }

  return consumeMemoryRateLimit(
    params.bucketKey,
    max,
    windowSeconds * 1000
  );
}

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const API_RATE_LIMITS = {
  perKeyPerMinute: readIntEnv("API_RATE_LIMIT_PER_KEY_MINUTE", 60),
  perUserPerMinute: readIntEnv("API_RATE_LIMIT_PER_USER_MINUTE", 120),
  perIpPerMinute: readIntEnv("API_RATE_LIMIT_PER_IP_MINUTE", 180),
};

export const REGISTER_RATE_LIMITS = {
  otpPerIpPerHour: readIntEnv("REGISTER_OTP_PER_IP_HOUR", 5),
};

export const SIGNUP_BONUS_LIMITS = {
  maxPerIpPerDay: readIntEnv("SIGNUP_BONUS_MAX_PER_IP_DAY", 3),
};

export function rateLimit429Response(
  retryAfterSec: number,
  message = "请求过于频繁，请稍后再试"
): Response {
  return Response.json(
    {
      error: {
        message,
        type: "rate_limit_error",
        code: "rate_limit_exceeded",
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}

/** Chat / Generations API：按 Key、用户、IP 多层限流 */
export async function enforceApiRateLimits(params: {
  keyHash: string;
  userId: string;
  clientIp: string;
}): Promise<RateLimitResult> {
  const ip = params.clientIp || "unknown";
  const checks = [
    {
      bucketKey: `api:key:${params.keyHash}`,
      max: API_RATE_LIMITS.perKeyPerMinute,
      windowSeconds: 60,
    },
    {
      bucketKey: `api:user:${params.userId}`,
      max: API_RATE_LIMITS.perUserPerMinute,
      windowSeconds: 60,
    },
    {
      bucketKey: `api:ip:${ip}`,
      max: API_RATE_LIMITS.perIpPerMinute,
      windowSeconds: 60,
    },
  ];

  for (const check of checks) {
    const result = await consumeRateLimit(check);
    if (!result.allowed) return result;
  }

  return { allowed: true };
}
