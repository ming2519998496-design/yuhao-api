import { authenticateApiKeyRequest } from "@/lib/api-key-auth";
import { executeWithFixedBilling } from "@/lib/billing-reserve";
import { runGoogleGeneration } from "@/lib/google-generations";
import {
  getModelApiKind,
  isChatModel,
  resolveModelChargeYuan,
  type ModelConfig,
} from "@/lib/models";
import { runOpenAiGeneration } from "@/lib/openai-generations";
import { resolveUpstreamApiKey } from "@/lib/upstream-keys-store";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function billingHeaders(cost: number, balance: number) {
  const headers = new Headers();
  headers.set("X-Yuhao-Billing-Cost-Cny", cost.toFixed(2));
  headers.set("X-Yuhao-Billing-Balance-Cny", balance.toFixed(2));
  return headers;
}

type GenerationRequestBody = {
  model?: string;
  prompt?: string;
  size?: string;
  quality?: string;
};

async function runGenerationForProvider(
  modelConfig: ModelConfig,
  apiKeyValue: string,
  prompt: string,
  body: GenerationRequestBody
) {
  if (modelConfig.provider === "google") {
    return runGoogleGeneration(modelConfig, apiKeyValue, prompt);
  }
  if (modelConfig.provider === "openai") {
    return runOpenAiGeneration(modelConfig, apiKeyValue, {
      prompt,
      size: body.size,
      quality: body.quality,
    });
  }
  return {
    ok: false as const,
    status: 400,
    data: {
      error: {
        message: `暂不支持 ${modelConfig.provider} 图像/视频生成`,
        type: "invalid_request_error",
      },
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    let body: GenerationRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: { message: "无效请求体" } }, { status: 400 });
    }

    const modelId = typeof body.model === "string" ? body.model.trim() : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!modelId) {
      return NextResponse.json(
        { error: { message: "请指定 model", type: "invalid_request_error" } },
        { status: 400 }
      );
    }
    if (!prompt) {
      return NextResponse.json(
        {
          error: {
            message: "请指定 prompt（生成描述）",
            type: "invalid_request_error",
          },
        },
        { status: 400 }
      );
    }

    const auth = await authenticateApiKeyRequest(
      request.headers.get("authorization"),
      modelId,
      null
    );
    if (!auth.ok) return auth.response;

    const { apiKey, modelConfig } = auth;

    if (isChatModel(modelConfig)) {
      return NextResponse.json(
        {
          error: {
            message: `模型 ${modelId} 为对话模型，请使用 POST /api/v1/chat/completions`,
            type: "invalid_request_error",
          },
        },
        { status: 400 }
      );
    }

    if (modelConfig.provider !== "google" && modelConfig.provider !== "openai") {
      return NextResponse.json(
        {
          error: {
            message: "当前仅支持 Google 与 OpenAI 图像/视频生成模型",
            type: "invalid_request_error",
          },
        },
        { status: 400 }
      );
    }

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

    const chargeYuan =
      resolveModelChargeYuan(modelConfig.pricing) ||
      (getModelApiKind(modelConfig) === "veo"
        ? 3
        : getModelApiKind(modelConfig) === "openai-image"
          ? 0.5
          : 0.5);

    const admin = createAdminClient();
    const result = await executeWithFixedBilling(
      admin,
      apiKey,
      modelConfig.id,
      chargeYuan,
      () => runGenerationForProvider(modelConfig, apiKeyValue, prompt, body)
    );

    if (!result.ok) {
      return result.response;
    }

    const headers = result.billing
      ? billingHeaders(result.billing.costCny, result.billing.balanceCny)
      : undefined;

    return NextResponse.json(result.data, { status: result.status, headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: { message, type: "server_error" } },
      { status: 500 }
    );
  }
}
