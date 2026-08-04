import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  buildBillingReserveContext,
  DEFAULT_MAX_COMPLETION_TOKENS,
  executeWithBilling,
  normalizeUsage,
} from "@/lib/billing-reserve";
import { handleOpenAIStreamProxy } from "@/lib/openai-stream-billing";
import {
  DEFAULT_MODEL_ID,
  isModelAllowedForKey,
  resolveAllowedCategoryIds,
} from "@/lib/api-key-models";
import { getEffectiveModelConfig } from "@/lib/model-pricing-store";
import { isChatModel, type ModelPricing } from "@/lib/models";
import { resolveUpstreamApiKey } from "@/lib/upstream-keys-store";
import { upstreamFetch } from "@/lib/upstream-fetch";
import {
  isVercelAiGatewayBaseUrl,
  resolveOpenAiUpstreamModelForRequest,
} from "@/lib/upstream-gateway";
import { createAdminClient } from "@/lib/supabase-admin";
import { apiServerErrorResponse } from "@/lib/api-error";

type ApiKeyRecord = {
  id: string;
  user_id: string;
  balance: number;
};

export type ChatCompletionsApiKey = {
  id: string;
  user_id: string;
  balance: number;
  allowed_category_ids?: string[] | null;
  default_model_id?: string | null;
};

export async function runChatCompletions(
  apiKey: ChatCompletionsApiKey,
  body: Record<string, unknown>
): Promise<Response> {
  try {
    const admin = createAdminClient();
    const {
      model: requestedModel,
      messages,
      webSearch: webSearchRaw,
      ...rest
    } = body;
    const webSearch = webSearchRaw === true;
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
            code: "model_required",
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
            code: "model_not_found",
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
            code: "model_not_allowed",
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
            code: "wrong_api_kind",
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
            code: "server_error",
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

    if (webSearch && provider !== "openai" && provider !== "google") {
      return NextResponse.json(
        {
          error: {
            message:
              "当前模型不支持原生联网搜索，请改用 OpenAI 或 Gemini 模型，或关闭联网搜索。",
            type: "invalid_request_error",
            code: "web_search_not_supported",
          },
        },
        { status: 400 }
      );
    }

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
        apiKeyValue,
        webSearch
      );
    }

    if (webSearch && provider === "openai") {
      return handleOpenAIWebSearchProxy(
        modelConfig,
        messages,
        apiKeyValue,
        pricing,
        apiKeyRecord,
        admin
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
    console.error("[chat/completions]", err);
    return apiServerErrorResponse();
  }
}

export function isStreamingRequested(rest: Record<string, unknown>): boolean {
  return rest.stream === true;
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

// ================= OpenAI / DeepSeek 兼容 =================
async function handleOpenAIProxy(
  modelConfig: {
    id: string;
    provider: string;
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
  // baseUrl 已在 model-pricing-store 按厂商解析；勿用 provider "openai" 重算，
  // 否则 Vercel 部署时 DeepSeek 会误走 AI Gateway 并报 AI_GATEWAY_API_KEY 错误。
  const upstreamBaseUrl = modelConfig.baseUrl.replace(/\/$/, "");
  const upstreamModel = resolveOpenAiUpstreamModelForRequest(
    modelConfig.id,
    upstreamBaseUrl,
    modelConfig.upstreamModelId
  );
  const viaGateway = isVercelAiGatewayBaseUrl(upstreamBaseUrl);
  const isDeepSeek = modelConfig.provider === "deepseek";
  const upstreamLabel = isDeepSeek
    ? "DeepSeek"
    : viaGateway
      ? "AI Gateway"
      : "OpenAI";
  const url = `${upstreamBaseUrl}/chat/completions`;

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
          e instanceof Error ? e.message : `无法连接 ${upstreamLabel} 上游`;
        const hint = isDeepSeek
          ? "请检查管理后台或环境变量中的 DEEPSEEK_API_KEY 是否有效"
          : viaGateway
            ? "请检查 AI Gateway Key 是否有效，或 Vercel 项目是否已开通 AI Gateway"
            : "请检查服务器能否访问 api.openai.com，或上游 Key 是否有效";
        return {
          ok: false,
          status: 502,
          data: {
            error: {
              message: `${upstreamLabel} 网络请求失败：${msg}（${hint}）`,
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
                message: `${upstreamLabel} 返回异常响应（HTTP ${response.status}）`,
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

/** OpenAI Responses API + web_search，结果转为 chat.completion JSON（非流式） */
async function handleOpenAIWebSearchProxy(
  modelConfig: {
    id: string;
    provider: string;
    baseUrl: string;
    upstreamModelId?: string;
  },
  messages: unknown,
  apiKeyValue: string,
  pricing: ModelPricing,
  apiKeyRecord: ApiKeyRecord,
  admin: ReturnType<typeof createAdminClient>
) {
  const reserveContext = buildBillingReserveContext({
    messages,
    max_tokens: DEFAULT_MAX_COMPLETION_TOKENS,
  });
  const upstreamBaseUrl = modelConfig.baseUrl.replace(/\/$/, "");
  const upstreamModel = resolveOpenAiUpstreamModelForRequest(
    modelConfig.id,
    upstreamBaseUrl,
    modelConfig.upstreamModelId
  );
  const viaGateway = isVercelAiGatewayBaseUrl(upstreamBaseUrl);
  const upstreamLabel = viaGateway ? "AI Gateway" : "OpenAI";
  const url = `${upstreamBaseUrl}/responses`;

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
            input: messagesToResponsesInput(
              messages as Array<{ role?: string; content?: unknown }> | undefined
            ),
            tools: [{ type: "web_search" }],
          }),
        });
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : `无法连接 ${upstreamLabel} 上游`;
        const hint = viaGateway
          ? "请检查 AI Gateway Key 是否有效，或 Vercel 项目是否已开通 AI Gateway"
          : "请检查服务器能否访问 api.openai.com，或上游 Key 是否有效";
        return {
          ok: false,
          status: 502,
          data: {
            error: {
              message: `${upstreamLabel} 联网搜索请求失败：${msg}（${hint}）`,
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
                message: `${upstreamLabel} 返回异常响应（HTTP ${response.status}）`,
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
              message: err?.message || `${upstreamLabel} 联网搜索失败`,
              type: "upstream_error",
            },
          },
        };
      }

      const openaiLike = convertResponsesToChatCompletion(data, modelConfig.id);
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

function messagesToResponsesInput(
  messages: Array<{ role?: string; content?: unknown }> | undefined
): Array<{ role: string; content: string }> {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((msg) => {
      const role =
        msg.role === "assistant" || msg.role === "system" || msg.role === "user"
          ? msg.role
          : "user";
      const content =
        typeof msg.content === "string"
          ? msg.content
          : msg.content == null
            ? ""
            : JSON.stringify(msg.content);
      return { role, content };
    })
    .filter((msg) => msg.content.trim().length > 0);
}

function convertResponsesToChatCompletion(
  responsesData: Record<string, unknown>,
  modelId: string
) {
  const { text, citations } = extractResponsesTextAndCitations(responsesData);
  const content = appendSourceLinks(text, citations);
  const usageRaw = (responsesData.usage ?? {}) as Record<string, unknown>;
  const usage = normalizeUsage(usageRaw);

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
          content,
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.prompt_tokens + usage.completion_tokens,
    },
  };
}

function extractResponsesTextAndCitations(data: Record<string, unknown>): {
  text: string;
  citations: Array<{ title: string; url: string }>;
} {
  const citations: Array<{ title: string; url: string }> = [];
  const seen = new Set<string>();

  const pushCitation = (title: string, url: string) => {
    const key = url.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    citations.push({ title: title.trim() || key, url: key });
  };

  if (typeof data.output_text === "string" && data.output_text.trim()) {
    // Still walk output for citations
  }

  const parts: string[] = [];
  const output = data.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (!item || typeof item !== "object") continue;
      const entry = item as {
        type?: string;
        content?: Array<{
          type?: string;
          text?: string;
          annotations?: Array<{
            type?: string;
            url?: string;
            title?: string;
          }>;
        }>;
      };
      if (entry.type !== "message" || !Array.isArray(entry.content)) continue;
      for (const part of entry.content) {
        if (part?.type === "output_text" && typeof part.text === "string") {
          parts.push(part.text);
        } else if (typeof part?.text === "string") {
          parts.push(part.text);
        }
        if (Array.isArray(part?.annotations)) {
          for (const ann of part.annotations) {
            if (ann?.type === "url_citation" && typeof ann.url === "string") {
              pushCitation(
                typeof ann.title === "string" ? ann.title : ann.url,
                ann.url
              );
            }
          }
        }
      }
    }
  }

  const text =
    parts.join("\n").trim() ||
    (typeof data.output_text === "string" ? data.output_text.trim() : "");

  return { text, citations };
}

function appendSourceLinks(
  text: string,
  sources: Array<{ title: string; url: string }>
): string {
  if (sources.length === 0) return text;
  const lines = sources.map((s) => `- [${s.title}](${s.url})`);
  const block = `参考来源：\n${lines.join("\n")}`;
  return text ? `${text}\n\n${block}` : block;
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
  apiKeyValue: string,
  webSearch = false
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

      const geminiBody: Record<string, unknown> = {
        contents: geminiContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: reserveContext.maxCompletionTokens,
        },
      };
      if (webSearch) {
        // 仅平台注入 google_search，不接受客户端任意 tools
        geminiBody.tools = [{ google_search: {} }];
      }

      let response: Response;
      try {
        response = await upstreamFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
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
        modelConfig.id,
        webSearch
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

function extractGeminiGroundingSources(geminiResponse: {
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: { uri?: string; title?: string };
      }>;
    };
  }>;
}): Array<{ title: string; url: string }> {
  const chunks =
    geminiResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources: Array<{ title: string; url: string }> = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri?.trim();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({
      title: chunk.web?.title?.trim() || uri,
      url: uri,
    });
  }
  return sources;
}

function convertGeminiToOpenAI(
  geminiResponse: {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: {
        groundingChunks?: Array<{
          web?: { uri?: string; title?: string };
        }>;
      };
    }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  },
  modelId: string,
  appendSources = false
) {
  let text =
    geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (appendSources) {
    text = appendSourceLinks(text, extractGeminiGroundingSources(geminiResponse));
  }
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
