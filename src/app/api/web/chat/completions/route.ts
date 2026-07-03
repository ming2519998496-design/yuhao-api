import { authenticateUserKeyById } from "@/lib/api-key-auth";
import { runChatCompletions } from "@/lib/chat-completions-handler";
import { guardWebApiRequest } from "@/lib/anti-abuse";
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
import { requireActiveUserResponse } from "@/lib/session-api";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await requireActiveUserResponse();
    if (session.response) return session.response;

    const parsedBody = await readJsonBodyWithLimit(request);
    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const body = parsedBody.body;
    const keyId = typeof body.keyId === "string" ? body.keyId.trim() : "";
    const requestedModel =
      typeof body.model === "string" ? body.model.trim() : undefined;
    const turnstileToken =
      typeof body.turnstileToken === "string" ? body.turnstileToken : undefined;

    if (!keyId) {
      return NextResponse.json(
        { error: { message: "请选择 API Key", type: "auth_error" } },
        { status: 400 }
      );
    }

    const guard = await guardWebApiRequest(request, {
      userId: session.user.id,
      turnstileToken,
    });
    if (guard) return guard;

    const auth = await authenticateUserKeyById(
      session.user.id,
      keyId,
      requestedModel
    );
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

    const admin = createAdminClient();
    let keyRowResult = await admin
      .from("api_keys")
      .select(KEY_AUTH_SELECT_FULL)
      .eq("id", keyId)
      .eq("user_id", session.user.id)
      .single();

    if (
      keyRowResult.error &&
      isMissingModelColumnsError(keyRowResult.error.message)
    ) {
      keyRowResult = await admin
        .from("api_keys")
        .select(KEY_AUTH_SELECT_LEGACY)
        .eq("id", keyId)
        .eq("user_id", session.user.id)
        .single();
    }

    const keyRow = keyRowResult.data;
    if (!keyRow) {
      return NextResponse.json(
        { error: { message: "密钥不存在", type: "auth_error" } },
        { status: 404 }
      );
    }

    const { keyId: _omit, ...upstreamBody } = body;
    void _omit;

    return runChatCompletions(keyRow, upstreamBody);
  } catch (err: unknown) {
    console.error("[web/chat/completions]", err);
    return apiServerErrorResponse();
  }
}
