import { NextResponse } from "next/server";

type ApiErrorBody = {
  error: {
    message: string;
    type: string;
    code: string;
  };
};

/** 构造 OpenAI 兼容错误 JSON（含稳定 code） */
export function apiErrorJson(
  message: string,
  opts: { type: string; code: string; status: number }
): Response {
  const body: ApiErrorBody = {
    error: {
      message,
      type: opts.type,
      code: opts.code,
    },
  };
  return NextResponse.json(body, { status: opts.status });
}

/** v1 OpenAI 兼容接口：对外隐藏内部错误细节 */
export function apiServerErrorResponse(): Response {
  return apiErrorJson("服务器错误，请稍后重试", {
    type: "server_error",
    code: "server_error",
    status: 500,
  });
}
