/** v1 OpenAI 兼容接口：对外隐藏内部错误细节 */
export function apiServerErrorResponse(): Response {
  return Response.json(
    {
      error: {
        message: "服务器错误，请稍后重试",
        type: "server_error",
      },
    },
    { status: 500 }
  );
}
