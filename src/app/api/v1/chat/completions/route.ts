import { runChatCompletions } from "@/lib/chat-completions-handler";
import { isUserFrozen } from "@/lib/account-frozen";
import {
  apiKeyAuthRateLimitResponse,
  enforceApiKeyAuthAllowed,
  recordFailedApiKeyAttempt,
} from "@/lib/anti-abuse";
import { apiServerErrorResponse } from "@/lib/api-error";
import {
  isMissingModelColumnsError,
  KEY_AUTH_SELECT_FULL,
  KEY_AUTH_SELECT_LEGACY,
} from "@/lib/api-keys-db";
import { getClientIp } from "@/lib/client-ip";
import { readJsonBodyWithLimit } from "@/lib/request-body-limit";
import {
  enforceApiRateLimits,
  rateLimit429Response,
} from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase-admin";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authFailLimit = await enforceApiKeyAuthAllowed(request);
    if (!authFailLimit.allowed) {
      return apiKeyAuthRateLimitResponse(authFailLimit.retryAfterSec);
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      await recordFailedApiKeyAttempt(request);
      return NextResponse.json(
        { error: { message: "请提供 API Key", type: "auth_error", code: "missing_api_key" } },
        { status: 401 }
      );
    }

    const rawKey = authHeader.slice(7).trim();
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const admin = createAdminClient();
    let keyResult = await admin
      .from("api_keys")
      .select(KEY_AUTH_SELECT_FULL)
      .eq("key_hash", keyHash)
      .single();

    if (keyResult.error && isMissingModelColumnsError(keyResult.error.message)) {
      keyResult = await admin
        .from("api_keys")
        .select(KEY_AUTH_SELECT_LEGACY)
        .eq("key_hash", keyHash)
        .single();
    }

    const apiKey = keyResult.data;
    const keyError = keyResult.error;

    if (keyError || !apiKey) {
      await recordFailedApiKeyAttempt(request);
      return NextResponse.json(
        { error: { message: "无效的 API Key", type: "auth_error", code: "invalid_api_key" } },
        { status: 401 }
      );
    }

    if (!apiKey.is_active) {
      return NextResponse.json(
        { error: { message: "API Key 已被禁用", type: "auth_error", code: "api_key_disabled" } },
        { status: 403 }
      );
    }

    if (await isUserFrozen(apiKey.user_id)) {
      return NextResponse.json(
        {
          error: {
            message: "账户已被冻结，API 调用已暂停",
            type: "auth_error",
            code: "api_key_disabled",
          },
        },
        { status: 403 }
      );
    }

    const rateLimit = await enforceApiRateLimits({
      keyHash,
      userId: apiKey.user_id,
      clientIp: getClientIp(request),
    });
    if (!rateLimit.allowed) {
      return rateLimit429Response(
        rateLimit.retryAfterSec,
        "API 调用过于频繁，请稍后再试"
      );
    }

    const parsedBody = await readJsonBodyWithLimit(request);
    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    return runChatCompletions(apiKey, parsedBody.body);
  } catch (err: unknown) {
    console.error("[chat/completions]", err);
    return apiServerErrorResponse();
  }
}
