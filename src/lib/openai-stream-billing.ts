import {
  finalizeRequestBilling,
  normalizeUsage,
  releaseRequestBilling,
  reserveForRequest,
  type BillingReserveContext,
  type TokenUsage,
} from "@/lib/billing-reserve";
import type { ModelPricing } from "@/lib/models";
import { upstreamFetch } from "@/lib/upstream-fetch";
import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type ApiKeyRecord = {
  id: string;
  user_id: string;
};

export type OpenAIStreamParams = {
  admin: AdminClient;
  apiKeyRecord: ApiKeyRecord;
  modelId: string;
  pricing: ModelPricing;
  reserveContext: BillingReserveContext;
  url: string;
  apiKeyValue: string;
  upstreamModel: string;
  messages: unknown;
  rest: Record<string, unknown>;
  viaGateway: boolean;
};

function mergeStreamRequestBody(
  upstreamModel: string,
  messages: unknown,
  rest: Record<string, unknown>
): Record<string, unknown> {
  const streamOptions =
    rest.stream_options && typeof rest.stream_options === "object"
      ? (rest.stream_options as Record<string, unknown>)
      : {};

  return {
    ...rest,
    model: upstreamModel,
    messages,
    stream: true,
    stream_options: {
      ...streamOptions,
      include_usage: true,
    },
  };
}

function parseSseUsage(buffer: string): TokenUsage | undefined {
  for (const line of buffer.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const parsed = JSON.parse(payload) as {
        usage?: Record<string, unknown>;
      };
      if (parsed.usage) {
        return normalizeUsage(parsed.usage);
      }
    } catch {
      /* ignore malformed chunk */
    }
  }
  return undefined;
}

export async function handleOpenAIStreamProxy(
  params: OpenAIStreamParams
): Promise<Response> {
  const reservation = await reserveForRequest(
    params.admin,
    params.apiKeyRecord.id,
    params.reserveContext,
    params.pricing
  );
  if (!reservation.ok) {
    return reservation.response;
  }

  const reservedAmount = reservation.reservedAmount;
  let upstreamResponse: Response;

  try {
    upstreamResponse = await upstreamFetch(params.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKeyValue}`,
      },
      body: JSON.stringify(
        mergeStreamRequestBody(
          params.upstreamModel,
          params.messages,
          params.rest
        )
      ),
    });
  } catch (e) {
    await releaseRequestBilling(
      params.admin,
      params.apiKeyRecord.id,
      reservedAmount
    );
    const msg = e instanceof Error ? e.message : "无法连接 OpenAI 上游";
    const hint = params.viaGateway
      ? "请检查 AI Gateway Key 是否有效，或 Vercel 项目是否已开通 AI Gateway"
      : "请检查服务器能否访问 api.openai.com，或上游 Key 是否有效";
    return Response.json(
      {
        error: {
          message: `OpenAI 网络请求失败：${msg}（${hint}）`,
          type: "upstream_error",
        },
      },
      { status: 502 }
    );
  }

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    await releaseRequestBilling(
      params.admin,
      params.apiKeyRecord.id,
      reservedAmount
    );
    const rawText = await upstreamResponse.text();
    let data: Record<string, unknown> = {};
    if (rawText) {
      try {
        data = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        data = {
          error: {
            message: `OpenAI 返回异常响应（HTTP ${upstreamResponse.status}）`,
            type: "upstream_error",
          },
        };
      }
    }
    return Response.json(data, { status: upstreamResponse.status || 502 });
  }

  const upstreamBody = upstreamResponse.body;
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let usage: TokenUsage | undefined;

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      sseBuffer += decoder.decode(chunk, { stream: true });
      if (sseBuffer.length > 512_000) {
        sseBuffer = sseBuffer.slice(-256_000);
      }
      const parsed = parseSseUsage(sseBuffer);
      if (parsed) usage = parsed;
    },
    async flush() {
      const trailing = decoder.decode();
      if (trailing) sseBuffer += trailing;
      const parsed = parseSseUsage(sseBuffer);
      if (parsed) usage = parsed;

      const billing = await finalizeRequestBilling(
        params.admin,
        params.apiKeyRecord,
        params.modelId,
        params.pricing,
        reservedAmount,
        usage,
        true,
        { fallbackCostYuan: reservedAmount }
      );

      if (!billing.ok) {
        console.error("[stream] billing failed after upstream success");
      }
    },
  });

  const readable = upstreamBody.pipeThrough(transform);
  const headers = new Headers(upstreamResponse.headers);
  headers.set("Content-Type", "text/event-stream; charset=utf-8");
  headers.set("Cache-Control", "no-cache, no-transform");
  headers.set("Connection", "keep-alive");
  headers.delete("content-length");

  return new Response(readable, {
    status: upstreamResponse.status,
    headers,
  });
}
