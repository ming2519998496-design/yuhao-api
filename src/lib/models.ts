export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  enabled: boolean;
}

export const MODEL_LIST: ModelConfig[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek V4",
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    enabled: true,
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    enabled: true,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
  },
];

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_LIST.find((m) => m.id === modelId && m.enabled);
}
