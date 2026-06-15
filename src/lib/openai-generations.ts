import { getModelApiKind, type ModelConfig } from "@/lib/models";
import { resolveOpenAiUpstreamModelForRequest } from "@/lib/upstream-gateway";
import { resolveUpstreamBaseUrl, upstreamFetch } from "@/lib/upstream-fetch";

export type OpenAiImageQuality = "low" | "medium" | "high" | "auto";
export type OpenAiImageSize =
  | "auto"
  | "1024x1024"
  | "1536x1024"
  | "1024x1536";

export type OpenAiGenerationInput = {
  prompt: string;
  size?: string;
  quality?: string;
};

const DEFAULT_SIZE: OpenAiImageSize = "1024x1024";
const DEFAULT_QUALITY: OpenAiImageQuality = "medium";

function normalizeQuality(raw?: string): OpenAiImageQuality {
  const v = raw?.trim().toLowerCase();
  if (v === "low" || v === "medium" || v === "high" || v === "auto") {
    return v;
  }
  return DEFAULT_QUALITY;
}

function normalizeSize(raw?: string): string {
  const v = raw?.trim();
  if (!v) return DEFAULT_SIZE;
  return v;
}

export async function runOpenAiGeneration(
  modelConfig: ModelConfig,
  apiKey: string,
  input: OpenAiGenerationInput
): Promise<{ ok: boolean; status: number; data: unknown }> {
  if (getModelApiKind(modelConfig) !== "openai-image") {
    return {
      ok: false,
      status: 400,
      data: {
        error: {
          message: "不支持的 OpenAI 生成类型",
          type: "invalid_request_error",
        },
      },
    };
  }

  const baseUrl = resolveUpstreamBaseUrl(
    modelConfig.provider,
    modelConfig.baseUrl
  ).replace(/\/$/, "");
  const upstreamModel = resolveOpenAiUpstreamModelForRequest(
    modelConfig.id,
    baseUrl,
    modelConfig.upstreamModelId
  );

  const response = await upstreamFetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: upstreamModel,
      prompt: input.prompt,
      n: 1,
      size: normalizeSize(input.size),
      quality: normalizeQuality(input.quality),
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    data?: Array<{
      b64_json?: string;
      url?: string;
      revised_prompt?: string;
    }>;
  };

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data: {
        error: {
          message: data.error?.message || "OpenAI 图像生成失败",
          type: "upstream_error",
        },
      },
    };
  }

  const images = (data.data ?? [])
    .map((item) => ({
      b64_json: item.b64_json,
      url: item.url,
      revised_prompt: item.revised_prompt,
    }))
    .filter((item) => item.b64_json || item.url);

  if (images.length === 0) {
    return {
      ok: false,
      status: 502,
      data: {
        error: {
          message: "上游未返回图像数据",
          type: "upstream_error",
        },
      },
    };
  }

  return {
    ok: true,
    status: 200,
    data: {
      object: "generation",
      model: modelConfig.id,
      type: "image",
      data: images,
    },
  };
}
