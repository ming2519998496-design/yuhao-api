import {
  isVercelAiGatewayEnabled,
  VERCEL_AI_GATEWAY_BASE_URL,
} from "@/lib/upstream-gateway";
import { ProxyAgent, fetch as undiciFetch } from "undici";

const PROXY_URL =
  process.env.HTTPS_PROXY?.trim() ||
  process.env.https_proxy?.trim() ||
  process.env.HTTP_PROXY?.trim() ||
  process.env.http_proxy?.trim() ||
  "";

let proxyAgent: ProxyAgent | null = null;

function getProxyAgent(): ProxyAgent | null {
  if (!PROXY_URL) return null;
  if (!proxyAgent) {
    proxyAgent = new ProxyAgent(PROXY_URL);
  }
  return proxyAgent;
}

export type UpstreamProvider = "openai" | "google" | "deepseek" | "anthropic";

/** .env.local 可覆盖各厂商 baseUrl；OpenAI 在启用 Gateway 时默认走 Vercel AI Gateway */
export function resolveUpstreamBaseUrl(
  provider: string,
  defaultBaseUrl: string
): string {
  const envKey = `${provider.toUpperCase()}_BASE_URL`;
  const override = process.env[envKey]?.trim();
  if (override) return override;

  if (provider === "openai" && isVercelAiGatewayEnabled()) {
    return VERCEL_AI_GATEWAY_BASE_URL;
  }

  return defaultBaseUrl;
}

/** 服务端请求 OpenAI / Google 等上游；读取 HTTPS_PROXY / HTTP_PROXY */
export async function upstreamFetch(
  url: string | URL,
  init?: RequestInit
): Promise<Response> {
  const agent = getProxyAgent();
  if (!agent) {
    return fetch(url, init);
  }
  return undiciFetch(url, {
    ...init,
    dispatcher: agent,
  } as Parameters<typeof undiciFetch>[1]) as unknown as Response;
}

export function isUpstreamProxyConfigured(): boolean {
  return Boolean(PROXY_URL);
}

export function getUpstreamProxyUrlForLog(): string {
  return PROXY_URL.replace(/:[^:@/]+@/, ":****@");
}
