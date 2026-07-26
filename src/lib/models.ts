export interface ModelCategory {
  id: string;
  name: string;
  description: string;
  sort: number;
}

export type ModelApiKind =
  | "chat"
  | "gemini-image"
  | "imagen"
  | "veo"
  | "openai-image";

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
    id: "openai-image",
    name: "OpenAI · 图像生成",
    description: "GPT Image 文生图（gpt-image 系列）",
    sort: 2,
  },
  {
    id: "google",
    name: "Google · Gemini 对话",
    description: "长上下文、高性价比与快速响应",
    sort: 3,
  },
  {
    id: "google-image",
    name: "Google · 图像生成",
    description: "Gemini 图像、Imagen、Nano Banana",
    sort: 4,
  },
  {
    id: "google-video",
    name: "Google · 视频生成",
    description: "Veo 文生视频",
    sort: 5,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "国产高性价比大模型，代码与推理表现优秀",
    sort: 6,
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
    description: "GPT-5 系列最轻量（官网 gpt-5-nano）",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 0.43, outputPerMillion: 3.46 },
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "openai",
    categoryId: "openai",
    description: "GPT-5 轻量版（官网 gpt-5-mini）",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 2.16, outputPerMillion: 17.28 },
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "openai",
    categoryId: "openai",
    description: "GPT-5 标准版（官网 gpt-5）",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 10.62, outputPerMillion: 84.96 },
  },
  {
    id: "gpt-5-pro",
    name: "GPT-5 Pro",
    provider: "openai",
    categoryId: "openai",
    description: "GPT-5 增强版（官网 gpt-5-pro）",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 127.44, outputPerMillion: 1019.52 },
  },
  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    provider: "openai",
    categoryId: "openai",
    description: "5.1 标准版（官网 gpt-5.1）",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 10.62, outputPerMillion: 84.96 },
  },
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    provider: "openai",
    categoryId: "openai",
    description: "5.2 标准版（官网 gpt-5.2）",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 14.87, outputPerMillion: 118.94 },
  },
  {
    id: "gpt-5.2-pro",
    name: "GPT-5.2 Pro",
    provider: "openai",
    categoryId: "openai",
    description: "暂未上架：官网价目未单独核实 gpt-5.2-pro，请用 gpt-5.4-pro / gpt-5.5-pro / gpt-5.6-sol",
    baseUrl: "https://api.openai.com/v1",
    enabled: false,
    pricing: { inputPerMillion: 178.42, outputPerMillion: 1427.33 },
  },
  {
    id: "gpt-5.4-nano",
    name: "GPT-5.4 Nano",
    provider: "openai",
    categoryId: "openai",
    description: "5.4 轻量 Nano（官网 gpt-5.4-nano）",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 1.73, outputPerMillion: 10.8 },
  },
  {
    id: "gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    provider: "openai",
    categoryId: "openai",
    description: "5.4 Mini（官网 gpt-5.4-mini）",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 6.48, outputPerMillion: 38.88 },
  },
  {
    id: "gpt-5.4",
    name: "GPT-5.4",
    provider: "openai",
    categoryId: "openai",
    description: "5.4 标准版（官网 gpt-5.4）",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 21.24, outputPerMillion: 127.44 },
  },
  {
    id: "gpt-5.4-pro",
    name: "GPT-5.4 Pro",
    provider: "openai",
    categoryId: "openai",
    description: "5.4 Pro（官网 gpt-5.4-pro）",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 254.88, outputPerMillion: 1529.28 },
  },
  {
    id: "gpt-5.5",
    name: "GPT-5.5",
    provider: "openai",
    categoryId: "openai",
    description: "5.5 标准版（官网 gpt-5.5）",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 42.48, outputPerMillion: 254.88 },
  },
  {
    id: "gpt-5.5-pro",
    name: "GPT-5.5 Pro",
    provider: "openai",
    categoryId: "openai",
    description: "5.5 Pro（官网 gpt-5.5-pro）",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 254.88, outputPerMillion: 1529.28 },
  },
  {
    id: "gpt-5.6-luna",
    name: "GPT-5.6 Luna",
    provider: "openai",
    categoryId: "openai",
    description: "5.6 经济档 Luna（官网 gpt-5.6-luna）",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 8.64, outputPerMillion: 51.84 },
  },
  {
    id: "gpt-5.6-terra",
    name: "GPT-5.6 Terra",
    provider: "openai",
    categoryId: "openai",
    description: "5.6 均衡档 Terra（官网 gpt-5.6-terra）",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 21.24, outputPerMillion: 127.44 },
  },
  {
    id: "gpt-5.6-sol",
    name: "GPT-5.6 Sol",
    provider: "openai",
    categoryId: "openai",
    description: "5.6 旗舰档 Sol（官网 gpt-5.6-sol；alias gpt-5.6 指向本模型）",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 42.48, outputPerMillion: 254.88 },
  },
  {
    id: "gpt-image-1-mini",
    name: "GPT Image 1 Mini",
    provider: "openai",
    categoryId: "openai-image",
    description: "轻量文生图；官方 $2.5/1M 输入 · $10/1M 输出，平台按 medium 1024 约 ¥0.10/张",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    apiKind: "openai-image",
    pricing: { inputPerMillion: 23.4, outputPerMillion: 93.6, perRequestYuan: 0.1 },
  },
  {
    id: "gpt-image-1",
    name: "GPT Image 1",
    provider: "openai",
    categoryId: "openai-image",
    description: "OpenAI 文生图；官方 $5/1M 输入 · $40/1M 输出，平台按 medium 1024 约 ¥0.59/张",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    apiKind: "openai-image",
    pricing: { inputPerMillion: 46.8, outputPerMillion: 374.4, perRequestYuan: 0.59 },
  },
  {
    id: "gpt-image-1.5",
    name: "GPT Image 1.5",
    provider: "openai",
    categoryId: "openai-image",
    description: "高质量文生图；官方 $8/1M 输入 · $30/1M 输出，平台按 medium 1024 约 ¥0.47/张",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    apiKind: "openai-image",
    pricing: { inputPerMillion: 74.88, outputPerMillion: 280.8, perRequestYuan: 0.47 },
  },
  {
    id: "gpt-image-2",
    name: "GPT Image 2",
    provider: "openai",
    categoryId: "openai-image",
    description: "最新旗舰文生图；官方 $8/1M 输入 · $30/1M 输出，平台按 medium 1024 约 ¥0.50/张",
    baseUrl: "https://api.openai.com/v1",
    enabled: true,
    apiKind: "openai-image",
    pricing: { inputPerMillion: 74.88, outputPerMillion: 280.8, perRequestYuan: 0.5 },
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
    description: "2.5 Flash（官网 gemini-2.5-flash）",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 2.59, outputPerMillion: 21.6 },
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    provider: "google",
    categoryId: "google",
    description: "2.5 Flash-Lite（官网 gemini-2.5-flash-lite）",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 0.83, outputPerMillion: 3.31 },
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    categoryId: "google",
    description: "2.5 Pro（官网 gemini-2.5-pro）",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 10.62, outputPerMillion: 84.96 },
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    provider: "google",
    categoryId: "google",
    description: "3.0 Flash 预览（官网 gemini-3-flash-preview；主力请用 3.6 Flash）",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 4.32, outputPerMillion: 25.92 },
  },
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro Preview",
    provider: "google",
    categoryId: "google",
    description: "已下架目录：请改用 gemini-3.1-pro-preview（3.5 Pro 尚未公开发布）",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: false,
    pricing: { inputPerMillion: 12.74, outputPerMillion: 101.95 },
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro Preview",
    provider: "google",
    categoryId: "google",
    description: "当前 Pro 预览旗舰（官网 gemini-3.1-pro-preview；≤200k 上下文价）",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 16.99, outputPerMillion: 101.95 },
  },
  {
    id: "gemini-3.1-flash-lite-preview",
    name: "Gemini 3.1 Flash Lite Preview",
    provider: "google",
    categoryId: "google",
    description: "已有稳定版，请改用 gemini-3.1-flash-lite",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: false,
    pricing: { inputPerMillion: 2.07, outputPerMillion: 12.42 },
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    provider: "google",
    categoryId: "google",
    description: "3.1 Flash-Lite（官网 gemini-3.1-flash-lite）",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 2.07, outputPerMillion: 12.42 },
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "google",
    categoryId: "google",
    description: "3.5 Flash（官网 gemini-3.5-flash）",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 12.96, outputPerMillion: 77.76 },
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    provider: "google",
    categoryId: "google",
    description: "3.5 Flash-Lite 高吞吐（官网 gemini-3.5-flash-lite）",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 2.48, outputPerMillion: 20.7 },
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    provider: "google",
    categoryId: "google",
    description: "3.6 Flash 主力版（官网 gemini-3.6-flash，2026-07 发布）",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: true,
    pricing: { inputPerMillion: 12.96, outputPerMillion: 64.8 },
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
    description: "V4 Flash（官网 deepseek-v4-flash；1M 上下文，支持思考/非思考）",
    baseUrl: "https://api.deepseek.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 1.16, outputPerMillion: 2.32 },
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    provider: "deepseek",
    categoryId: "deepseek",
    description: "V4 Pro（官网 deepseek-v4-pro；1M 上下文，旗舰推理）",
    baseUrl: "https://api.deepseek.com/v1",
    enabled: true,
    pricing: { inputPerMillion: 3.7, outputPerMillion: 7.39 },
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat（旧）",
    provider: "deepseek",
    categoryId: "deepseek",
    description: "已停用：请改用 deepseek-v4-flash（厂商于 2026-07-24 UTC 下线旧 ID）",
    baseUrl: "https://api.deepseek.com/v1",
    enabled: false,
    pricing: { inputPerMillion: 1.16, outputPerMillion: 2.32 },
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek Reasoner（旧）",
    provider: "deepseek",
    categoryId: "deepseek",
    description: "已停用：请改用 deepseek-v4-flash 思考模式或 deepseek-v4-pro",
    baseUrl: "https://api.deepseek.com/v1",
    enabled: false,
    pricing: { inputPerMillion: 1.16, outputPerMillion: 2.32 },
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
