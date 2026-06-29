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

async function fetchGoogleMediaAsBase64(
  uri: string,
  apiKey: string
): Promise<string | null> {
  const useHeaderKey =
    uri.includes("generativelanguage.googleapis.com") && !uri.includes("key=");
  const url = useHeaderKey
    ? uri
    : uri.includes("key=")
      ? uri
      : `${uri}${uri.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await upstreamFetch(url, {
      headers: useHeaderKey ? { "x-goog-api-key": apiKey } : undefined,
    });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) return null;
    return buffer.toString("base64");
  } catch {
    return null;
  }
}

type VeoVideoPayload = {
  uri?: string;
  bytesBase64Encoded?: string;
  mimeType?: string;
};

function collectVeoVideoEntry(
  video: VeoVideoPayload | null | undefined,
  bucket: Array<{ uri?: string; b64_json?: string; mime_type?: string }>
) {
  if (!video) return;
  const mimeType = video.mimeType ?? "video/mp4";
  if (video.bytesBase64Encoded) {
    bucket.push({ b64_json: video.bytesBase64Encoded, mime_type: mimeType });
    return;
  }
  if (video.uri) {
    bucket.push({ uri: video.uri, mime_type: mimeType });
  }
}

function extractVeoVideosFromResponse(response: Record<string, unknown>): Array<{
  uri?: string;
  b64_json?: string;
  mime_type?: string;
}> {
  const videos: Array<{ uri?: string; b64_json?: string; mime_type?: string }> =
    [];

  const generateVideoResponse = response.generateVideoResponse as
    | Record<string, unknown>
    | undefined;
  const generatedSamples = generateVideoResponse?.generatedSamples;
  if (Array.isArray(generatedSamples)) {
    for (const sample of generatedSamples) {
      if (!sample || typeof sample !== "object") continue;
      const row = sample as { video?: VeoVideoPayload };
      collectVeoVideoEntry(row.video, videos);
    }
  }

  const legacy = response.generatedVideos ?? response.videos ?? [];
  if (Array.isArray(legacy)) {
    for (const item of legacy) {
      if (!item || typeof item !== "object") continue;
      const row = item as { video?: VeoVideoPayload } & VeoVideoPayload;
      collectVeoVideoEntry(row.video ?? row, videos);
    }
  }

  return videos;
}

function veoFilteredReason(response: Record<string, unknown>): string | null {
  const generateVideoResponse = response.generateVideoResponse as
    | Record<string, unknown>
    | undefined;
  const reasons = generateVideoResponse?.raiMediaFilteredReasons;
  if (!Array.isArray(reasons) || reasons.length === 0) return null;
  return reasons.filter((r) => typeof r === "string").join("；");
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
      parameters: {
        aspectRatio: "16:9",
      },
    }),
  });

  let startData: Record<string, unknown> = {};
  try {
    startData = (await startRes.json()) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      status: 502,
      data: {
        error: {
          message: "Veo 返回异常响应",
          type: "upstream_error",
        },
      },
    };
  }
  if (!startRes.ok) {
    const err = startData.error as { message?: string } | undefined;
    return {
      ok: false,
      status: startRes.status,
      data: {
        error: {
          message: err?.message || "Veo 任务创建失败",
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
    const pollRes = await upstreamFetch(pollUrl, {
      headers: { "x-goog-api-key": apiKey },
    });
    let pollData: Record<string, unknown> = {};
    try {
      pollData = (await pollRes.json()) as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        status: 502,
        data: {
          error: {
            message: "Veo 轮询返回异常响应",
            type: "upstream_error",
          },
        },
      };
    }

    if (!pollRes.ok) {
      const err = pollData.error as { message?: string } | undefined;
      return {
        ok: false,
        status: pollRes.status,
        data: {
          error: {
            message: err?.message || "Veo 轮询失败",
            type: "upstream_error",
          },
        },
      };
    }

    if (pollData.done) {
      if (pollData.error) {
        const err = pollData.error as { message?: string };
        return {
          ok: false,
          status: 502,
          data: {
            error: {
              message: err.message || "Veo 生成失败",
              type: "upstream_error",
            },
          },
        };
      }

      const response = pollData.response ?? {};
      const rawVideos = extractVeoVideosFromResponse(
        response as Record<string, unknown>
      );
      const videos: Array<{ uri?: string; b64_json?: string; mime_type?: string }> =
        [];

      for (const item of rawVideos) {
        const mimeType = item.mime_type ?? "video/mp4";
        if (item.b64_json) {
          videos.push({ b64_json: item.b64_json, mime_type: mimeType });
          continue;
        }
        if (item.uri) {
          videos.push({ uri: item.uri, mime_type: mimeType });
        }
      }

      if (videos.length === 0) {
        const filtered = veoFilteredReason(response as Record<string, unknown>);
        return {
          ok: false,
          status: 502,
          data: {
            error: {
              message:
                filtered ??
                "Veo 任务已完成，但未返回可下载的视频（可能被内容安全策略拦截）",
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
