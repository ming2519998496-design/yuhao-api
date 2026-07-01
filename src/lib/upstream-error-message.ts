/** 避免将上游 API Key 片段直接展示给终端用户 */
export function sanitizeUpstreamErrorMessage(message: string): string {
  return message
    .replace(/\b(sk|vck)_[A-Za-z0-9._-]{8,}\b/g, "$1_***")
    .replace(
      /Incorrect API key provided:[^.]*\./i,
      "上游 OpenAI / Gateway Key 无效，请管理员在「上游 Key 设置」中检查配置。"
    )
    .replace(
      /Authentication failed\.\s*Create an API key and set in AI_GATEWAY_API_KEY.*/i,
      "上游路由配置异常：DeepSeek 等模型不应走 Vercel AI Gateway。若仍出现此提示，请联系管理员检查部署配置。"
    );
}
