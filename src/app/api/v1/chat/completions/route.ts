import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  buildBillingReserveContext,
  DEFAULT_MAX_COMPLETION_TOKENS,
  executeWithBilling,
  normalizeUsage,
} from "@/lib/billing-reserve";
import { handleOpenAIStreamProxy } from "@/lib/openai-stream-billing";
import { readJsonBodyWithLimit } from "@/lib/request-body-limit";
import {
  DEFAULT_MODEL_ID,
  isModelAllowedForKey,
  resolveAllowedCategoryIds,
} from "@/lib/api-key-models";
import {
  isMissingModelColumnsError,
  KEY_AUTH_SELECT_FULL,
  KEY_AUTH_SELECT_LEGACY,
} from "@/lib/api-keys-db";
import { getEffectiveModelConfig } from "@/lib/model-pricing-store";
import { isChatModel, type ModelPricing } from "@/lib/models";
import { resolveUpstreamApiKey } from "@/lib/upstream-keys-store";
import { upstreamFetch } from "@/lib/upstream-fetch";
import {
  isVercelAiGatewayBaseUrl,
  resolveOpenAiUpstreamModelForRequest,
} from "@/lib/upstream-gateway";
import { createAdminClient } from "@/lib/supabase-admin";
import { isUserFrozen } from "@/lib/account-frozen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApiKeyRecord = {
  id: string;
  user_id: string;
  balance: number;
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: { message: "请提供 API Key", type: "auth_error" } },
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
      return NextResponse.json(
        { error: { message: "无效的 API Key", type: "auth_error" } },
        { status: 401 }
      );
    }

    if (!apiKey.is_active) {
      return NextResponse.json(
        { error: { message: "API Key 已被禁用", type: "auth_error" } },
        { status: 403 }
      );
    }

    if (await isUserFrozen(apiKey.user_id)) {
      return NextResponse.json(
        {
          error: {
            message: "账户已被冻结，API 调用已暂停",
            type: "auth_error",
          },
        },
        { status: 403 }
      );
    }

    const parsedBody = await readJsonBodyWithLimit(request);
    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const body = parsedBody.body;
    const { model: requestedModel, messages, ...rest } = body;
    const allowedCategories = resolveAllowedCategoryIds(
      apiKey.allowed_category_ids as string[] | undefined
    );
    const modelId =
      typeof requestedModel === "string" && requestedModel.trim()
        ? requestedModel.trim()
        : (apiKey.default_model_id as string | undefined) ?? DEFAULT_MODEL_ID;

    if (!modelId) {
      return NextResponse.json(
        {
          error: {
            message: "请指定模型 (model)，或在令牌管理创建 Key 时设置默认模型",
            type: "invalid_request_error",
          },
        },
        { status: 400 }
      );
    }

    const modelConfig = await getEffectiveModelConfig(modelId);
    if (!modelConfig) {
      return NextResponse.json(
        {
          error: {
            message: `不支持的模型: ${modelId}`,
            type: "invalid_request_error",
          },
        },
        { status: 400 }
      );
    }

    if (!isModelAllowedForKey(modelId, allowedCategories)) {
      return NextResponse.json(
        {
          error: {
            message: `此 API Key 无权调用模型 ${modelId}，请使用已授权分组下的模型`,
            type: "permission_error",
          },
        },
        { status: 403 }
      );
    }

    if (!isChatModel(modelConfig)) {
      return NextResponse.json(
        {
          error: {
            message: `模型 ${modelId} 为图像/视频生成，请使用 POST /api/v1/generations`,
            type: "invalid_request_error",
          },
        },
        { status: 400 }
      );
    }

    const pricing = modelConfig.pricing;
    const apiKeyValue = await resolveUpstreamApiKey(modelConfig.provider);
    if (!apiKeyValue) {
      return NextResponse.json(
        {
          error: {
            message: `服务商 ${modelConfig.provider} 未配置`,
            type: "server_error",
          },
        },
        { status: 500 }
      );
    }

    const apiKeyRecord: ApiKeyRecord = {
      id: apiKey.id,
      user_id: apiKey.user_id,
      balance: Number(apiKey.balance),
    };

    const provider = modelConfig.provider;

    if (provider === "anthropic") {
      return handleAnthropicProxy(
        modelConfig,
        body,
        pricing,
        apiKeyRecord,
        admin,
        apiKeyValue
      );
    }
    if (provider === "google") {
      if (hasToolCallingParams(body)) {
        return NextResponse.json(
          {
            error: {
              message:
                "Gemini 模型暂不支持 tools / tool_choice。请改用 OpenAI 或 DeepSeek 分组下的模型进行 Agent / 工具调用。",
              type: "invalid_request_error",
              code: "tools_not_supported",
            },
          },
          { status: 400 }
        );
      }
      return handleGeminiProxy(
        modelConfig,
        messages,
        pricing,
        apiKeyRecord,
        admin,
        apiKeyValue
      );
    }

    return handleOpenAIProxy(
      modelConfig,
      messages,
      rest,
      apiKeyValue,
      pricing,
      apiKeyRecord,
      admin
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: { message, type: "server_error" } },
      { status: 500 }
    );
  }
}

async function respondWithBilling(
  result: Awaited<ReturnType<typeof executeWithBilling>>
) {
  if (!result.ok) {
    return result.response;
  }

  const headers = new Headers();
  if (result.billing) {
    headers.set(
      "X-Yuhao-Billing-Cost-Cny",
      result.billing.costCny.toFixed(2)
    );
    headers.set(
      "X-Yuhao-Billing-Balance-Cny",
      result.billing.balanceCny.toFixed(2)
    );
  }

  return NextResponse.json(result.data, {
    status: result.status,
    headers,
  });
}

function hasToolCallingParams(body: Record<string, unknown>): boolean {
  return body.tools != null || body.tool_choice != null;
}

function isStreamingRequested(rest: Record<string, unknown>): boolean {
  return rest.stream === true;
}

// ================= OpenAI / DeepSeek 兼容 =================
async function handleOpenAIProxy(
  modelConfig: {
    id: string;
    baseUrl: string;
    upstreamModelId?: string;
  },
  messages: unknown,
  rest: Record<string, unknown>,
  apiKeyValue: string,
  pricing: ModelPricing,
  apiKeyRecord: ApiKeyRecord,
  admin: ReturnType<typeof createAdminClient>
) {
  const reserveContext = buildBillingReserveContext({
    messages,
    ...rest,
  });
  const upstreamModel = resolveOpenAiUpstreamModelForRequest(
    modelConfig.id,
    modelConfig.baseUrl,
    modelConfig.upstreamModelId
  );
  const viaGateway = isVercelAiGatewayBaseUrl(modelConfig.baseUrl);
  const url = `${modelConfig.baseUrl}/chat/completions`;

  if (isStreamingRequested(rest)) {
    return handleOpenAIStreamProxy({
      admin,
      apiKeyRecord,
      modelId: modelConfig.id,
      pricing,
      reserveContext,
      url,
      apiKeyValue,
      upstreamModel,
      messages,
      rest,
      viaGateway,
    });
  }

  const result = await executeWithBilling(
    admin,
    apiKeyRecord,
    modelConfig.id,
    pricing,
    reserveContext,
    async () => {
      let response: Response;
      try {
        response = await upstreamFetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKeyValue}`,
          },
          body: JSON.stringify({
            model: upstreamModel,
            messages,
            stream: false,
            ...rest,
          }),
        });
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "无法连接 OpenAI 上游";
        const hint = viaGateway
          ? "请检查 AI Gateway Key 是否有效，或 Vercel 项目是否已开通 AI Gateway"
          : "请检查服务器能否访问 api.openai.com，或上游 Key 是否有效";
        return {
          ok: false,
          status: 502,
          data: {
            error: {
              message: `OpenAI 网络请求失败：${msg}（${hint}）`,
              type: "upstream_error",
            },
          },
        };
      }

      const rawText = await response.text();
      let data: Record<string, unknown> = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
          return {
            ok: false,
            status: response.status || 502,
            data: {
              error: {
                message: `OpenAI 返回异常响应（HTTP ${response.status}）`,
                type: "upstream_error",
              },
            },
          };
        }
      }

      const usage =
        response.ok && data.usage
          ? normalizeUsage(data.usage as Record<string, unknown>)
          : undefined;

      return {
        ok: response.ok,
        status: response.status,
        data,
        usage,
      };
    }
  );

  return respondWithBilling(result);
}

// ================= Anthropic / Claude =================
async function handleAnthropicProxy(
  modelConfig: { id: string; baseUrl: string },
  body: Record<string, unknown>,
  pricing: ModelPricing,
  apiKeyRecord: ApiKeyRecord,
  admin: ReturnType<typeof createAdminClient>,
  apiKeyValue: string
) {
  const { messages, system, max_tokens, ...rest } = body as {
    messages?: unknown[];
    system?: string;
    max_tokens?: number;
  };

  const maxCompletionTokens =
    typeof max_tokens === "number" && max_tokens > 0
      ? Math.min(max_tokens, 8192)
      : DEFAULT_MAX_COMPLETION_TOKENS;

  const reserveContext = buildBillingReserveContext(body);

  const result = await executeWithBilling(
    admin,
    apiKeyRecord,
    modelConfig.id,
    pricing,
    reserveContext,
    async () => {
      const url = `${modelConfig.baseUrl}/messages`;

      const anthropicBody: Record<string, unknown> = {
        model: modelConfig.id,
        messages,
        max_tokens: maxCompletionTokens,
        ...rest,
      };

      if (system) anthropicBody.system = system;

      const response = await upstreamFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKeyValue,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(anthropicBody),
      });

      const data = await response.json();
      const usage =
        response.ok && data.usage
          ? normalizeUsage(data.usage as Record<string, unknown>)
          : undefined;

      return {
        ok: response.ok,
        status: response.status,
        data,
        usage,
      };
    }
  );

  return respondWithBilling(result);
}

// ================= Gemini =================
async function handleGeminiProxy(
  modelConfig: { id: string; baseUrl: string },
  messages: unknown,
  pricing: ModelPricing,
  apiKeyRecord: ApiKeyRecord,
  admin: ReturnType<typeof createAdminClient>,
  apiKeyValue: string
) {
  const reserveContext = buildBillingReserveContext({
    messages,
    max_tokens: DEFAULT_MAX_COMPLETION_TOKENS,
  });

  const result = await executeWithBilling(
    admin,
    apiKeyRecord,
    modelConfig.id,
    pricing,
    reserveContext,
    async () => {
      const geminiContents = convertMessagesToGemini(
        messages as Array<{ role: string; content: string }>
      );

      const url = `${modelConfig.baseUrl}/models/${modelConfig.id}:generateContent?key=${apiKeyValue}`;

      let response: Response;
      try {
        response = await upstreamFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: geminiContents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: reserveContext.maxCompletionTokens,
            },
          }),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "无法连接 Google 上游";
        return {
          ok: false,
          status: 502,
          data: {
            error: {
              message: `Google 网络请求失败：${msg}（请检查 HTTPS_PROXY 或 GOOGLE_BASE_URL）`,
              type: "upstream_error",
            },
          },
        };
      }

      const rawText = await response.text();
      let data: Record<string, unknown> = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
          return {
            ok: false,
            status: response.status || 502,
            data: {
              error: {
                message: `Google 返回异常响应（HTTP ${response.status}）`,
                type: "upstream_error",
              },
            },
          };
        }
      }

      if (!response.ok) {
        const err = data.error as { message?: string } | undefined;
        return {
          ok: false,
          status: response.status,
          data: {
            error: {
              message: err?.message || "Gemini 调用失败",
              type: "upstream_error",
            },
          },
        };
      }

      const openaiLike = convertGeminiToOpenAI(
        data as Parameters<typeof convertGeminiToOpenAI>[0],
        modelConfig.id
      );

      return {
        ok: true,
        status: 200,
        data: openaiLike,
        usage: openaiLike.usage,
      };
    }
  );

  return respondWithBilling(result);
}

function convertMessagesToGemini(
  messages: Array<{ role: string; content: string }> | undefined
): Array<{ role: string; parts: Array<{ text: string }> }> {
  if (!messages) return [];

  return messages.map((msg) => {
    const role =
      msg.role === "assistant"
        ? "model"
        : msg.role === "system"
          ? "user"
          : msg.role;
    return {
      role,
      parts: [{ text: msg.content }],
    };
  });
}

function convertGeminiToOpenAI(
  geminiResponse: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  },
  modelId: string
) {
  const text =
    geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const promptTokens = geminiResponse?.usageMetadata?.promptTokenCount || 0;
  const completionTokens =
    geminiResponse?.usageMetadata?.candidatesTokenCount || 0;
  const totalTokens = geminiResponse?.usageMetadata?.totalTokenCount || 0;

  return {
    id: `chatcmpl-${crypto.randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: modelId,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: text,
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
    },
  };
}
