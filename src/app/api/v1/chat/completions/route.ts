import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getModelConfig } from "@/lib/models";
import { createAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 18, output: 72 },
  "gpt-4o-mini": { input: 1.1, output: 4.4 },
  "deepseek-chat": { input: 0.5, output: 2 },
  "claude-sonnet-4-20250514": { input: 22, output: 88 },
  "gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
};

export async function POST(request: NextRequest) {
  try {
    // 第1步：验证用户 API Key
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
    const { data: apiKey, error: keyError } = await admin
      .from("api_keys")
      .select("id, user_id, balance, is_active")
      .eq("key_hash", keyHash)
      .single();

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

    // 第2步：解析请求
    const body = await request.json();
    const { model, messages, stream: requestedStream, ...rest } = body;

    if (!model) {
      return NextResponse.json(
        { error: { message: "请指定模型 (model)", type: "invalid_request_error" } },
        { status: 400 }
      );
    }

    const modelConfig = getModelConfig(model);
    if (!modelConfig) {
      return NextResponse.json(
        { error: { message: `不支持的模型: ${model}`, type: "invalid_request_error" } },
        { status: 400 }
      );
    }

    // 第3步：余额检查
    const pricing = PRICING[model];
    if (pricing) {
      const minCost = pricing.input * (100 / 1_000_000);
      if (apiKey.balance < minCost) {
        return NextResponse.json(
          { error: { message: "额度不足，请充值", type: "insufficient_quota" } },
          { status: 402 }
        );
      }
    }

    // 第4步：获取上游 API Key
    const apiKeyValue = process.env[`${modelConfig.provider.toUpperCase()}_API_KEY`];
    if (!apiKeyValue) {
      return NextResponse.json(
        { error: { message: `服务商 ${modelConfig.provider} 未配置`, type: "server_error" } },
        { status: 500 }
      );
    }

    // 第5步：按 provider 分发
    const provider = modelConfig.provider;

    if (provider === "anthropic") {
      return handleAnthropicProxy(modelConfig, body, pricing, apiKey, admin, apiKeyValue);
    }
    if (provider === "google") {
      return handleGeminiProxy(modelConfig, messages, pricing, apiKey, admin, apiKeyValue);
    }

    return handleOpenAIProxy(modelConfig, messages, rest, apiKeyValue, pricing, apiKey, admin);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: { message, type: "server_error" } },
      { status: 500 }
    );
  }
}

// ================= OpenAI / DeepSeek 兼容 =================
async function handleOpenAIProxy(
  modelConfig: { id: string; baseUrl: string },
  messages: unknown,
  rest: Record<string, unknown>,
  apiKeyValue: string,
  pricing: { input: number; output: number } | undefined,
  apiKeyRecord: { id: string; user_id: string; balance: number },
  admin: ReturnType<typeof createAdminClient>
) {
  const url = `${modelConfig.baseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKeyValue}`,
    },
    body: JSON.stringify({
      model: modelConfig.id,
      messages,
      stream: false,
      ...rest,
    }),
  });

  const data = await response.json();

  if (response.ok && data.usage && pricing) {
    try {
      await deductAndLog(admin, apiKeyRecord, modelConfig.id, data.usage, pricing);
    } catch (e) {
      console.error("扣费失败:", e);
    }
  }

  return NextResponse.json(data, { status: response.status });
}

// ================= Anthropic / Claude =================
async function handleAnthropicProxy(
  modelConfig: { id: string; baseUrl: string },
  body: Record<string, unknown>,
  pricing: { input: number; output: number } | undefined,
  apiKeyRecord: { id: string; user_id: string; balance: number },
  admin: ReturnType<typeof createAdminClient>,
  apiKeyValue: string
) {
  const url = `${modelConfig.baseUrl}/messages`;

  const { messages, system, max_tokens, ...rest } = body as {
    messages?: unknown[];
    system?: string;
    max_tokens?: number;
  };

  const anthropicBody: Record<string, unknown> = {
    model: modelConfig.id,
    messages,
    max_tokens: max_tokens || 4096,
    ...rest,
  };

  if (system) anthropicBody.system = system;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKeyValue,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(anthropicBody),
  });

  const data = await response.json();

  if (response.ok && data.usage && pricing) {
    try {
      await deductAndLog(admin, apiKeyRecord, modelConfig.id, data.usage, pricing);
    } catch (e) {
      console.error("扣费失败:", e);
    }
  }

  return NextResponse.json(data, { status: response.status });
}

// ================= Gemini =================
async function handleGeminiProxy(
  modelConfig: { id: string; baseUrl: string },
  messages: unknown,
  pricing: { input: number; output: number } | undefined,
  apiKeyRecord: { id: string; user_id: string; balance: number },
  admin: ReturnType<typeof createAdminClient>,
  apiKeyValue: string
) {
  // Gemini 的 API 格式跟 OpenAI 不同，需要转换
  // 将 OpenAI 格式的 messages 转为 Gemini 格式
  const geminiContents = convertMessagesToGemini(messages as Array<{ role: string; content: string }>);

  const url = `${modelConfig.baseUrl}/models/${modelConfig.id}:generateContent?key=${apiKeyValue}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: geminiContents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: { message: data.error?.message || "Gemini 调用失败", type: "upstream_error" } },
      { status: response.status }
    );
  }

  // 将 Gemini 响应转成 OpenAI 格式
  const openaiLike = convertGeminiToOpenAI(data, modelConfig.id);

  if (pricing && openaiLike.usage) {
    try {
      await deductAndLog(admin, apiKeyRecord, modelConfig.id, openaiLike.usage, pricing);
    } catch (e) {
      console.error("扣费失败:", e);
    }
  }

  return NextResponse.json(openaiLike);
}

function convertMessagesToGemini(
  messages: Array<{ role: string; content: string }> | undefined
): Array<{ role: string; parts: Array<{ text: string }> }> {
  if (!messages) return [];

  return messages.map((msg) => {
    // Gemini 使用 "user" 和 "model" 角色
    const role = msg.role === "assistant" ? "model" : msg.role === "system" ? "user" : msg.role;
    return {
      role,
      parts: [{ text: msg.content }],
    };
  });
}

function convertGeminiToOpenAI(
  geminiResponse: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } },
  modelId: string
) {
  const text = geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const promptTokens = geminiResponse?.usageMetadata?.promptTokenCount || 0;
  const completionTokens = geminiResponse?.usageMetadata?.candidatesTokenCount || 0;
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

// ================= 扣费 =================
async function deductAndLog(
  admin: ReturnType<typeof createAdminClient>,
  apiKeyRecord: { id: string; user_id: string; balance: number },
  model: string,
  usage: { prompt_tokens: number; completion_tokens: number },
  pricing: { input: number; output: number }
) {
  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;

  const cost =
    (promptTokens / 1_000_000) * pricing.input +
    (completionTokens / 1_000_000) * pricing.output;

  const roundedCost = Math.max(0.01, Math.round(cost * 100) / 100);
  if (roundedCost <= 0) return;

  await admin.rpc("deduct_balance", {
    p_key_id: apiKeyRecord.id,
    p_amount: roundedCost,
  });

  await admin.from("usage_logs").insert({
    api_key_id: apiKeyRecord.id,
    user_id: apiKeyRecord.user_id,
    model,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
    cost: roundedCost,
    success: true,
  });
}
