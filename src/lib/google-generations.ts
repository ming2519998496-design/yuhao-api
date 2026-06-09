import { getModelApiKind, type ModelConfig } from "@/lib/models";
import { upstreamFetch } from "@/lib/upstream-fetch";

const VEO_POLL_MS = 5000;
const VEO_MAX_WAIT_MS = 120_000;

function googleUrl(baseUrl: string, modelId: string, action: string, apiKey: string) {
  return `${baseUrl}/models/${modelId}:${action}?key=${apiKey}`;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function runGoogleGeneration(
  modelConfig: ModelConfig,
  apiKey: string,
  prompt: string
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const kind = getModelApiKind(modelConfig);
  if (kind === "gemini-image") {
    return runGeminiImage(modelConfig, apiKey, prompt);
  }
  if (kind === "imagen") {
    return runImagen(modelConfig, apiKey, prompt);
  }
  if (kind === "veo") {
    return runVeo(modelConfig, apiKey, prompt);
  }
  return {
    ok: false,
    status: 400,
    data: {
      error: {
        message: "不支持的生成类型",
        type: "invalid_request_error",
      },
    },
  };
}

async function runGeminiImage(
  modelConfig: ModelConfig,
  apiKey: string,
  prompt: string
) {
  const url = googleUrl(
    modelConfig.baseUrl,
    modelConfig.id,
    "generateContent",
    apiKey
  );

  const response = await upstreamFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data: {
        error: {
          message: data.error?.message || "Gemini 图像生成失败",
          type: "upstream_error",
        },
      },
    };
  }

  const images: Array<{ b64_json?: string; mime_type?: string }> = [];
  let text = "";
  for (const part of data.candidates?.[0]?.content?.parts ?? []) {
    if (part.text) text += part.text;
    if (part.inlineData?.data) {
      images.push({
        b64_json: part.inlineData.data,
        mime_type: part.inlineData.mimeType,
      });
    }
  }

  return {
    ok: true,
    status: 200,
    data: {
      object: "generation",
      model: modelConfig.id,
      type: "image",
      text: text || undefined,
      data: images,
    },
  };
}

async function runImagen(
  modelConfig: ModelConfig,
  apiKey: string,
  prompt: string
) {
  const url = googleUrl(modelConfig.baseUrl, modelConfig.id, "predict", apiKey);

  const response = await upstreamFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1 },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data: {
        error: {
          message: data.error?.message || "Imagen 生成失败",
          type: "upstream_error",
        },
      },
    };
  }

  const images = (data.predictions ?? []).map(
    (p: { bytesBase64Encoded?: string; mimeType?: string }) => ({
      b64_json: p.bytesBase64Encoded,
      mime_type: p.mimeType ?? "image/png",
    })
  );

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

async function runVeo(
  modelConfig: ModelConfig,
  apiKey: string,
  prompt: string
) {
  const startUrl = googleUrl(
    modelConfig.baseUrl,
    modelConfig.id,
    "predictLongRunning",
    apiKey
  );

  const startRes = await upstreamFetch(startUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
    }),
  });

  const startData = await startRes.json();
  if (!startRes.ok) {
    return {
      ok: false,
      status: startRes.status,
      data: {
        error: {
          message: startData.error?.message || "Veo 任务创建失败",
          type: "upstream_error",
        },
      },
    };
  }

  const operationName = startData.name as string | undefined;
  if (!operationName) {
    return {
      ok: false,
      status: 502,
      data: {
        error: {
          message: "Veo 未返回 operation 名称",
          type: "upstream_error",
        },
      },
    };
  }

  const pollBase = modelConfig.baseUrl.replace(/\/$/, "");
  const deadline = Date.now() + VEO_MAX_WAIT_MS;

  while (Date.now() < deadline) {
    await sleep(VEO_POLL_MS);
    const pollUrl = `${pollBase}/${operationName}?key=${apiKey}`;
    const pollRes = await upstreamFetch(pollUrl);
    const pollData = await pollRes.json();

    if (!pollRes.ok) {
      return {
        ok: false,
        status: pollRes.status,
        data: {
          error: {
            message: pollData.error?.message || "Veo 轮询失败",
            type: "upstream_error",
          },
        },
      };
    }

    if (pollData.done) {
      if (pollData.error) {
        return {
          ok: false,
          status: 502,
          data: {
            error: {
              message: pollData.error.message || "Veo 生成失败",
              type: "upstream_error",
            },
          },
        };
      }

      const videos: Array<{ uri?: string; b64_json?: string; mime_type?: string }> =
        [];
      const response = pollData.response ?? {};
      const generated = response.generatedVideos ?? response.videos ?? [];

      for (const item of generated) {
        const video = item.video ?? item;
        if (video.uri) videos.push({ uri: video.uri, mime_type: video.mimeType });
        if (video.bytesBase64Encoded) {
          videos.push({
            b64_json: video.bytesBase64Encoded,
            mime_type: video.mimeType ?? "video/mp4",
          });
        }
      }

      return {
        ok: true,
        status: 200,
        data: {
          object: "generation",
          model: modelConfig.id,
          type: "video",
          operation: operationName,
          data: videos,
        },
      };
    }
  }

  return {
    ok: false,
    status: 504,
    data: {
      error: {
        message: "Veo 生成超时，请稍后重试",
        type: "upstream_error",
      },
      operation: operationName,
    },
  };
}
