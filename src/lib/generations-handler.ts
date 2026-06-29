import { executeWithFixedBilling } from "@/lib/billing-reserve";
import { apiServerErrorResponse } from "@/lib/api-error";
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
import { NextResponse } from "next/server";

export type GenerationRequestBody = {
  model?: string;
  prompt?: string;
  size?: string;
  quality?: string;
};

export type GenerationApiKey = {
  id: string;
  user_id: string;
  balance: number;
};

function billingHeaders(cost: number, balance: number) {
  const headers = new Headers();
  headers.set("X-Yuhao-Billing-Cost-Cny", cost.toFixed(2));
  headers.set("X-Yuhao-Billing-Balance-Cny", balance.toFixed(2));
  return headers;
}

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

export async function runGenerationRequest(
  apiKey: GenerationApiKey,
  modelConfig: ModelConfig,
  body: GenerationRequestBody
): Promise<Response> {
  try {
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
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

    if (isChatModel(modelConfig)) {
      return NextResponse.json(
        {
          error: {
            message: `模型 ${modelConfig.id} 为对话模型，请使用对话模式`,
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

    const upstream = result.data as {
      error?: { message?: string };
    };
    if (result.status >= 400 || upstream?.error) {
      return NextResponse.json(result.data, { status: result.status });
    }

    const headers = result.billing
      ? billingHeaders(result.billing.costCny, result.billing.balanceCny)
      : undefined;

    return NextResponse.json(result.data, { status: result.status, headers });
  } catch (err: unknown) {
    console.error("[generations]", err);
    const message =
      err instanceof Error ? err.message : "视频生成处理失败";
    return NextResponse.json(
      {
        error: {
          message:
            message.includes("JSON") || message.includes("heap")
              ? "视频文件过大或响应异常，请稍后重试"
              : "服务器错误，请稍后重试",
          type: "server_error",
        },
      },
      { status: 500 }
    );
  }
}
