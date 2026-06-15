export const UPSTREAM_KEY = "upstream_api_keys";

export type UpstreamProviderId = "openai" | "google" | "deepseek";

export type UpstreamKeysConfig = Record<UpstreamProviderId, string>;

export const UPSTREAM_PROVIDERS: {
  id: UpstreamProviderId;
  label: string;
  envVar: string;
  hint: string;
}[] = [
  {
    id: "deepseek",
    label: "DeepSeek",
    envVar: "DEEPSEEK_API_KEY",
    hint: "用于 deepseek-v4-flash、deepseek-v4-pro",
  },
  {
    id: "openai",
    label: "OpenAI（Vercel AI Gateway）",
    envVar: "AI_GATEWAY_API_KEY",
    hint: "推荐填 Vercel AI Gateway Key（非个人 OpenAI Key）；用于 GPT 对话与 GPT Image 图像模型，走 ai-gateway.vercel.sh",
  },
  {
    id: "google",
    label: "Google Gemini",
    envVar: "GOOGLE_API_KEY",
    hint: "用于 Gemini 对话、图像（Imagen/Nano Banana）、视频（Veo）模型",
  },
];

export const EMPTY_UPSTREAM_KEYS: UpstreamKeysConfig = {
  openai: "",
  google: "",
  deepseek: "",
};

export function mergeUpstreamKeys(raw: unknown): UpstreamKeysConfig {
  const base = { ...EMPTY_UPSTREAM_KEYS };
  if (!raw || typeof raw !== "object") return base;

  const obj = raw as Record<string, unknown>;
  for (const { id } of UPSTREAM_PROVIDERS) {
    const v = obj[id];
    if (typeof v === "string") base[id] = v.trim();
  }
  return base;
}

/** 列表展示用：不暴露完整密钥 */
export function maskUpstreamKey(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "••••••••";
  return `••••••••${trimmed.slice(-4)}`;
}

/** 判断提交值是否为掩码占位（未修改该字段） */
export function isMaskedSubmission(value: string, existing: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("••••")) return true;
  return trimmed === maskUpstreamKey(existing);
}

export function mergeUpstreamKeyUpdates(
  incoming: UpstreamKeysConfig,
  existing: UpstreamKeysConfig
): UpstreamKeysConfig {
  const next = { ...existing };
  for (const { id } of UPSTREAM_PROVIDERS) {
    const raw = incoming[id] ?? "";
    if (!raw.trim()) {
      next[id] = "";
      continue;
    }
    if (isMaskedSubmission(raw, existing[id])) continue;
    next[id] = raw.trim();
  }
  return next;
}

export function sanitizeUpstreamKeys(keys: UpstreamKeysConfig): UpstreamKeysConfig {
  const next = { ...EMPTY_UPSTREAM_KEYS };
  for (const { id } of UPSTREAM_PROVIDERS) {
    next[id] = (keys[id] ?? "").trim();
  }
  return next;
}
