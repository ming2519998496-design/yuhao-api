/** 避免将上游 API Key 片段直接展示给终端用户 */
export function sanitizeUpstreamErrorMessage(message: string): string {
  return message
    .replace(/\b(sk|vck)_[A-Za-z0-9._-]{8,}\b/g, "$1_***")
    .replace(
      /Incorrect API key provided:[^.]*\./i,
      "上游 OpenAI / Gateway Key 无效，请管理员在「上游 Key 设置」中检查配置。"
    );
}
