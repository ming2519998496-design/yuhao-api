/** Vercel AI Gateway — OpenAI 兼容上游（替代个人 OpenAI API Key） */
export const VERCEL_AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";

/** Gateway 上 slug 与平台 model id 不一致时的映射 */
const OPENAI_GATEWAY_MODEL_SLUG: Record<string, string> = {
  "gpt-5.1": "openai/gpt-5.1-instant",
};

export function isVercelAiGatewayEnabled(): boolean {
  const flag = process.env.OPENAI_USE_VERCEL_GATEWAY?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return true;
  if (process.env.AI_GATEWAY_API_KEY?.trim()) return true;
  const baseOverride = process.env.OPENAI_BASE_URL?.trim();
  if (baseOverride) {
    return isVercelAiGatewayBaseUrl(baseOverride);
  }
  /** Vercel 部署默认走 AI Gateway，避免个人 OpenAI Key 直连 */
  return process.env.VERCEL === "1";
}

export function isVercelAiGatewayBaseUrl(baseUrl: string): boolean {
  const normalized = baseUrl.replace(/\/$/, "");
  return (
    normalized === VERCEL_AI_GATEWAY_BASE_URL.replace(/\/$/, "") ||
    normalized.includes("ai-gateway.vercel.sh")
  );
}

/** 发往上游的 model 参数（Gateway 需 openai/ 前缀） */
export function resolveOpenAiUpstreamModelId(
  platformModelId: string,
  explicitUpstreamId?: string | null
): string {
  const explicit = explicitUpstreamId?.trim();
  if (explicit) return explicit;

  const mapped = OPENAI_GATEWAY_MODEL_SLUG[platformModelId];
  if (mapped) return mapped;

  return `openai/${platformModelId}`;
}

export function resolveOpenAiUpstreamModelForRequest(
  platformModelId: string,
  baseUrl: string,
  explicitUpstreamId?: string | null
): string {
  if (isVercelAiGatewayBaseUrl(baseUrl)) {
    return resolveOpenAiUpstreamModelId(platformModelId, explicitUpstreamId);
  }
  return platformModelId;
}
