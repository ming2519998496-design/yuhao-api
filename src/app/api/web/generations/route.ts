import { authenticateUserKeyById } from "@/lib/api-key-auth";
import { runGenerationRequest } from "@/lib/generations-handler";
import { apiServerErrorResponse } from "@/lib/api-error";
import { getClientIp } from "@/lib/client-ip";
import {
  enforceApiRateLimits,
  rateLimit429Response,
} from "@/lib/rate-limit";
import { requireActiveUserResponse } from "@/lib/session-api";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type WebGenerationBody = {
  keyId?: string;
  model?: string;
  prompt?: string;
  size?: string;
  quality?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await requireActiveUserResponse();
    if (session.response) return session.response;

    let body: WebGenerationBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: { message: "无效请求体" } }, { status: 400 });
    }

    const keyId = typeof body.keyId === "string" ? body.keyId.trim() : "";
    const modelId = typeof body.model === "string" ? body.model.trim() : "";

    if (!keyId) {
      return NextResponse.json(
        { error: { message: "请选择 API Key", type: "auth_error" } },
        { status: 400 }
      );
    }
    if (!modelId) {
      return NextResponse.json(
        { error: { message: "请指定 model", type: "invalid_request_error" } },
        { status: 400 }
      );
    }

    const auth = await authenticateUserKeyById(session.user.id, keyId, modelId);
    if (!auth.ok) return auth.response;

    const rateLimit = await enforceApiRateLimits({
      keyHash: `web:${keyId}`,
      userId: session.user.id,
      clientIp: getClientIp(request),
    });
    if (!rateLimit.allowed) {
      return rateLimit429Response(
        rateLimit.retryAfterSec,
        "调用过于频繁，请稍后再试"
      );
    }

    return runGenerationRequest(auth.apiKey, auth.modelConfig, body);
  } catch (err: unknown) {
    console.error("[web/generations]", err);
    return apiServerErrorResponse();
  }
}
