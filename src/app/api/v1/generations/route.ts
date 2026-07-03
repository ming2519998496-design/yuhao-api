import { authenticateApiKeyRequest } from "@/lib/api-key-auth";
import {
  apiKeyAuthRateLimitResponse,
  enforceApiKeyAuthAllowed,
  recordFailedApiKeyAttempt,
} from "@/lib/anti-abuse";
import { runGenerationRequest } from "@/lib/generations-handler";
import { apiServerErrorResponse } from "@/lib/api-error";
import { getClientIp } from "@/lib/client-ip";
import {
  enforceApiRateLimits,
  rateLimit429Response,
} from "@/lib/rate-limit";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GenerationRequestBody = {
  model?: string;
  prompt?: string;
  size?: string;
  quality?: string;
};

export async function POST(request: NextRequest) {
  try {
    const authFailLimit = await enforceApiKeyAuthAllowed(request);
    if (!authFailLimit.allowed) {
      return apiKeyAuthRateLimitResponse(authFailLimit.retryAfterSec);
    }

    let body: GenerationRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: { message: "无效请求体" } }, { status: 400 });
    }

    const modelId = typeof body.model === "string" ? body.model.trim() : "";
    if (!modelId) {
      return NextResponse.json(
        { error: { message: "请指定 model", type: "invalid_request_error" } },
        { status: 400 }
      );
    }

    const auth = await authenticateApiKeyRequest(
      request.headers.get("authorization"),
      modelId,
      null
    );
    if (!auth.ok) {
      await recordFailedApiKeyAttempt(request);
      return auth.response;
    }

    const { apiKey, modelConfig } = auth;

    const authHeader = request.headers.get("authorization");
    const rawKey = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";
    const keyHash = rawKey
      ? crypto.createHash("sha256").update(rawKey).digest("hex")
      : apiKey.id;

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

    return runGenerationRequest(apiKey, modelConfig, body);
  } catch (err: unknown) {
    console.error("[generations]", err);
    return apiServerErrorResponse();
  }
}
