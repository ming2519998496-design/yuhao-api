export interface ModelCategory {
  id: string;
  name: string;
  description: string;
  sort: number;
}

export type ModelApiKind = "chat" | "gemini-image" | "imagen" | "veo";

/** 平台计费：对话按 tokens；图像/视频可用 perRequestYuan 按次 */
export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  /** 按次扣费（元），图像/视频生成优先使用 */
  perRequestYuan?: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  categoryId: string;
  description: string;
  baseUrl: string;
  enabled: boolean;
  /** 上游 model 参数（如 Vercel Gateway 的 openai/gpt-4o-mini）；未设则按 provider 规则推导 */
  upstreamModelId?: string;
  /** 默认 chat */
  apiKind?: ModelApiKind;
  pricing: ModelPricing;
}

export function getModelApiKind(config: ModelConfig): ModelApiKind {
  return config.apiKind ?? "chat";
}

export function isChatModel(config: ModelConfig): boolean {
  return getModelApiKind(config) === "chat";
}

/** 图像/视频：按次扣费，非 tokens */
export function usesPerRequestPricing(config: ModelConfig): boolean {
  return !isChatModel(config);
}

export function resolveModelChargeYuan(pricing: ModelPricing): number {
  if (pricing.perRequestYuan != null && pricing.perRequestYuan > 0) {
    return pricing.perRequestYuan;
  }
  return 0;
}

export const MODEL_CATEGORIES: ModelCategory[] = [
  {
    id: "openai",
    name: "OpenAI · GPT",
    description: "通用对话、推理与多模态能力突出",
    sort: 1,
  },
  {
    id: "google",
    name: "Google · Gemini 对话",
    description: "长上下文、高性价比与快速响应",
    sort: 2,
  },
  {
    id: "google-image",
    name: "Google · 图像生成",
    description: "Gemini 图像、Imagen、Nano Banana",
    sort: 3,
  },
  {
    id: "google-video",
    name: "Google · 视频生成",
    description: "Veo 文生视频",
    sort: 4,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "国产高性价比大模型，代码与推理表现优秀",
    sort: 5,
  },
];

/** 平台统一价目表（展示与扣费共用） */
export const MODEL_LIST: ModelConfig[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    categoryId: "openai",
    description: "旗舰多模态模型，适合复杂任务与高质量输出",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 21.24, outputPerMillion: 84.96 },
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    categoryId: "openai",
    description: "轻量高速，适合日常对话与大批量调用",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 1.3, outputPerMillion: 5.18 },
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "openai",
    categoryId: "openai",
    description: "4.1 系列最轻量，适合简单任务",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 0.86, outputPerMillion: 3.46 },
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "openai",
    categoryId: "openai",
    description: "4.1 轻量版，性价比与速度均衡",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 3.46, outputPerMillion: 13.82 },
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    categoryId: "openai",
    description: "4.1 标准版，代码与指令遵循能力强",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 16.99, outputPerMillion: 67.97 },
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "openai",
    categoryId: "openai",
    description: "GPT-5 系列最轻量",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 0.86, outputPerMillion: 3.46 },
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "openai",
    categoryId: "openai",
    description: "GPT-5 轻量版",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 2.16, outputPerMillion: 8.64 },
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "openai",
    categoryId: "openai",
    description: "GPT-5 标准版",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 21.24, outputPerMillion: 84.96 },
  },
  {
    id: "gpt-5-pro",
    name: "GPT-5 Pro",
    provider: "openai",
    categoryId: "openai",
    description: "GPT-5 增强版",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 42.48, outputPerMillion: 169.92 },
  },
  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    provider: "openai",
    categoryId: "openai",
    description: "5.1 标准版",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 23.36, outputPerMillion: 93.46 },
  },
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    provider: "openai",
    categoryId: "openai",
    description: "5.2 标准版",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 24.21, outputPerMillion: 96.85 },
  },
  {
    id: "gpt-5.2-pro",
    name: "GPT-5.2 Pro",
    provider: "openai",
    categoryId: "openai",
    description: "5.2 增强版",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 46.73, outputPerMillion: 186.91 },
  },
  {
    id: "gpt-5.4-nano",
    name: "GPT-5.4 Nano",
    provider: "openai",
    categoryId: "openai",
    description: "5.4 系列最轻量",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 1.04, outputPerMillion: 4.15 },
  },
  {
    id: "gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    provider: "openai",
    categoryId: "openai",
    description: "5.4 轻量版",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 2.59, outputPerMillion: 10.37 },
  },
  {
    id: "gpt-5.4",
    name: "GPT-5.4",
    provider: "openai",
    categoryId: "openai",
    description: "5.4 标准版",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 23.79, outputPerMillion: 95.16 },
  },
  {
    id: "gpt-5.4-pro",
    name: "GPT-5.4 Pro",
    provider: "openai",
    categoryId: "openai",
    description: "5.4 增强版",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 46.73, outputPerMillion: 186.91 },
  },
  {
    id: "gpt-5.5",
    name: "GPT-5.5",
    provider: "openai",
    categoryId: "openai",
    description: "5.5 标准版",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 25.49, outputPerMillion: 101.95 },
  },
  {
    id: "gpt-5.5-pro",
    name: "GPT-5.5 Pro",
    provider: "openai",
    categoryId: "openai",
    description: "5.5 增强版",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 50.98, outputPerMillion: 203.9 },
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
    categoryId: "google",
    description: "已下架；Google 已于 2026-06-01 停用，请改用 Gemini 2.5+",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: false,
    pricing: { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash-Lite",
    provider: "google",
    categoryId: "google",
    description: "已下架；Google 已于 2026-06-01 停用，请改用 Gemini 2.5 Flash-Lite",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: false,
    pricing: { inputPerMillion: 0.08, outputPerMillion: 0.32 },
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    categoryId: "google",
    description: "2.5 快速版，1M 上下文",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 1.3, outputPerMillion: 5.18 },
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    provider: "google",
    categoryId: "google",
    description: "2.5 轻量版",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 0.83, outputPerMillion: 3.31 },
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    categoryId: "google",
    description: "2.5 旗舰版，强推理与长上下文",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 10.62, outputPerMillion: 84.96 },
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    provider: "google",
    categoryId: "google",
    description: "3.0 快速预览版",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 1.73, outputPerMillion: 6.91 },
  },
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro Preview",
    provider: "google",
    categoryId: "google",
    description: "3.0 旗舰预览版",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 12.74, outputPerMillion: 101.95 },
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro Preview",
    provider: "google",
    categoryId: "google",
    description: "3.1 旗舰预览版",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 13.59, outputPerMillion: 110.45 },
  },
  {
    id: "gemini-3.1-flash-lite-preview",
    name: "Gemini 3.1 Flash Lite Preview",
    provider: "google",
    categoryId: "google",
    description: "3.1 轻量预览版",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 0.83, outputPerMillion: 3.31 },
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    provider: "google",
    categoryId: "google",
    description: "3.1 轻量稳定版",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 0.83, outputPerMillion: 3.31 },
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "google",
    categoryId: "google",
    description: "3.5 最新快速版",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 2.16, outputPerMillion: 8.64 },
  },
  {
    id: "gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash Image",
    provider: "google",
    categoryId: "google-image",
    description: "Gemini 原生图像生成（Nano Banana）",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    apiKind: "gemini-image",
    pricing: { inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: 0.37 },
  },
  {
    id: "gemini-3-pro-image-preview",
    name: "Gemini 3 Pro Image Preview",
    provider: "google",
    categoryId: "google-image",
    description: "3 Pro 图像预览（Nano Banana Pro）",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    apiKind: "gemini-image",
    pricing: { inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: 1.25 },
  },
  {
    id: "gemini-3-pro-image",
    name: "Gemini 3 Pro Image",
    provider: "google",
    categoryId: "google-image",
    description: "3 Pro 图像稳定版",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    apiKind: "gemini-image",
    pricing: { inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: 1.25 },
  },
  {
    id: "nano-banana-pro-preview",
    name: "Nano Banana Pro Preview",
    provider: "google",
    categoryId: "google-image",
    description: "Nano Banana Pro 预览别名",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    apiKind: "gemini-image",
    pricing: { inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: 1.25 },
  },
  {
    id: "gemini-3.1-flash-image-preview",
    name: "Gemini 3.1 Flash Image Preview",
    provider: "google",
    categoryId: "google-image",
    description: "3.1 Flash 图像预览（Nano Banana 2）",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    apiKind: "gemini-image",
    pricing: { inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: 0.63 },
  },
  {
    id: "gemini-3.1-flash-image",
    name: "Gemini 3.1 Flash Image",
    provider: "google",
    categoryId: "google-image",
    description: "3.1 Flash 图像稳定版",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    apiKind: "gemini-image",
    pricing: { inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: 0.63 },
  },
  {
    id: "imagen-4.0-generate-001",
    name: "Imagen 4",
    provider: "google",
    categoryId: "google-image",
    description: "Imagen 4 标准图像生成",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    apiKind: "imagen",
    pricing: { inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: 0.37 },
  },
  {
    id: "imagen-4.0-ultra-generate-001",
    name: "Imagen 4 Ultra",
    provider: "google",
    categoryId: "google-image",
    description: "Imagen 4 超高质量",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    apiKind: "imagen",
    pricing: { inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: 0.56 },
  },
  {
    id: "imagen-4.0-fast-generate-001",
    name: "Imagen 4 Fast",
    provider: "google",
    categoryId: "google-image",
    description: "Imagen 4 快速版",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    apiKind: "imagen",
    pricing: { inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: 0.19 },
  },
  {
    id: "veo-2.0-generate-001",
    name: "Veo 2",
    provider: "google",
    categoryId: "google-video",
    description: "Veo 2 文生视频",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    apiKind: "veo",
    pricing: { inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: 26.21 },
  },
  {
    id: "veo-3.0-generate-001",
    name: "Veo 3",
    provider: "google",
    categoryId: "google-video",
    description: "Veo 3 文生视频",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    apiKind: "veo",
    pricing: { inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: 29.95 },
  },
  {
    id: "veo-3.0-fast-generate-001",
    name: "Veo 3 Fast",
    provider: "google",
    categoryId: "google-video",
    description: "Veo 3 快速文生视频",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    apiKind: "veo",
    pricing: { inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: 7.49 },
  },
  {
    id: "veo-3.1-generate-preview",
    name: "Veo 3.1 Preview",
    provider: "google",
    categoryId: "google-video",
    description: "Veo 3.1 预览",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    apiKind: "veo",
    pricing: { inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: 29.95 },
  },
  {
    id: "veo-3.1-fast-generate-preview",
    name: "Veo 3.1 Fast Preview",
    provider: "google",
    categoryId: "google-video",
    description: "Veo 3.1 快速预览",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    apiKind: "veo",
    pricing: { inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: 7.49 },
  },
  {
    id: "veo-3.1-lite-generate-preview",
    name: "Veo 3.1 Lite Preview",
    provider: "google",
    categoryId: "google-video",
    description: "Veo 3.1 轻量预览",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    apiKind: "veo",
    pricing: { inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: 3.74 },
  },
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    provider: "deepseek",
    categoryId: "deepseek",
    description: "快速、经济，支持 1M 上下文（非思考 / 思考模式）",
    baseUrl: "https://api.deepseek.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 1.16, outputPerMillion: 2.32 },
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    provider: "deepseek",
    categoryId: "deepseek",
    description: "旗舰推理与 Agent 能力，支持 1M 上下文",
    baseUrl: "https://api.deepseek.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 3.7, outputPerMillion: 7.39 },
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat（旧）",
    provider: "deepseek",
    categoryId: "deepseek",
    description: "已弃用，请改用 deepseek-v4-flash；厂商将于 2026-07 停用",
    baseUrl: "https://api.deepseek.com/v1",
    enabled: false,
    pricing: { inputPerMillion: 0.5, outputPerMillion: 2 },
  },
];

/** 格式化为前台展示用的价格文案 */
export function formatPriceYuan(amount: number): string {
  const s = amount < 1 ? amount.toString() : String(amount);
  return `¥${s}`;
}

export function getModelPricing(modelId: string): ModelPricing | undefined {
  return getModelConfig(modelId)?.pricing;
}

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_LIST.find((m) => m.id === modelId && m.enabled);
}

export function getEnabledModels(): ModelConfig[] {
  return MODEL_LIST.filter((m) => m.enabled);
}

/** 按平台单价计算本次调用费用（元） */
export function calculateUsageCost(
  usage: { prompt_tokens?: number; completion_tokens?: number },
  pricing: ModelPricing
): number {
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  const cost =
    (promptTokens / 1_000_000) * pricing.inputPerMillion +
    (completionTokens / 1_000_000) * pricing.outputPerMillion;
  if (cost <= 0) return 0;
  return Math.max(0.01, Math.round(cost * 100) / 100);
}

export type ModelCatalogGroup = {
  category: ModelCategory;
  models: ModelConfig[];
};

/** 按分类分组的模型目录（供前台展示与选择） */
export function getModelCatalog(): ModelCatalogGroup[] {
  const enabled = getEnabledModels();
  return MODEL_CATEGORIES.map((category) => ({
    category,
    models: enabled
      .filter((m) => m.categoryId === category.id)
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
  })).filter((g) => g.models.length > 0);
}
