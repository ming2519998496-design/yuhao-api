/** Vercel Serverless 请求体上限约 4.5MB，预留余量 */
export const MAX_CHAT_REQUEST_BODY_BYTES = 4 * 1024 * 1024;

export function payloadTooLargeResponse(
  actualBytes: number,
  maxBytes: number = MAX_CHAT_REQUEST_BODY_BYTES
): Response {
  const actualKb = Math.ceil(actualBytes / 1024);
  const maxMb = (maxBytes / (1024 * 1024)).toFixed(1);
  return Response.json(
    {
      error: {
        message: `请求体过大（约 ${actualKb} KB，上限 ${maxMb} MB）。请减少 tools 数量、缩短工具描述或压缩 messages 历史后重试。`,
        type: "invalid_request_error",
        code: "payload_too_large",
      },
    },
    { status: 413 }
  );
}

export function readJsonBodyWithLimit(
  request: Request,
  maxBytes: number = MAX_CHAT_REQUEST_BODY_BYTES
): Promise<
  | { ok: true; body: Record<string, unknown>; rawBytes: number }
  | { ok: false; response: Response }
> {
  return readTextBodyWithLimit(request, maxBytes).then((result) => {
    if (!result.ok) return result;
    try {
      const body = JSON.parse(result.text) as Record<string, unknown>;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return {
          ok: false,
          response: Response.json(
            {
              error: {
                message: "请求体须为 JSON 对象",
                type: "invalid_request_error",
              },
            },
            { status: 400 }
          ),
        };
      }
      return { ok: true, body, rawBytes: result.rawBytes };
    } catch {
      return {
        ok: false,
        response: Response.json(
          {
            error: {
              message: "无效的 JSON 请求体",
              type: "invalid_request_error",
            },
          },
          { status: 400 }
        ),
      };
    }
  });
}

async function readTextBodyWithLimit(
  request: Request,
  maxBytes: number
): Promise<
  | { ok: true; text: string; rawBytes: number }
  | { ok: false; response: Response }
> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declared = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declared) && declared > maxBytes) {
      console.warn(
        `[chat] payload_too_large content-length=${declared} max=${maxBytes}`
      );
      return { ok: false, response: payloadTooLargeResponse(declared, maxBytes) };
    }
  }

  const rawText = await request.text();
  const rawBytes = Buffer.byteLength(rawText, "utf8");
  if (rawBytes > maxBytes) {
    console.warn(
      `[chat] payload_too_large body-bytes=${rawBytes} max=${maxBytes}`
    );
    return { ok: false, response: payloadTooLargeResponse(rawBytes, maxBytes) };
  }

  return { ok: true, text: rawText, rawBytes };
}
