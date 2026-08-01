export type ChatMode = "chat" | "image" | "video";

export type CatalogGroup = {
  category: { id: string; name: string; description?: string };
  models: CatalogModel[];
};

export type CatalogModel = {
  id: string;
  name: string;
  provider?: string;
  apiKind?: string;
  description?: string;
  inputPriceHint?: string;
  outputPriceHint?: string;
  priceUnit?: string;
};

/** 支持原生联网搜索的厂商（DeepSeek 等暂不支持） */
export function supportsNativeWebSearch(provider?: string): boolean {
  return provider === "openai" || provider === "google";
}

export function modelMatchesMode(apiKind: string, mode: ChatMode): boolean {
  if (mode === "chat") return apiKind === "chat";
  if (mode === "video") return apiKind === "veo";
  return apiKind !== "chat" && apiKind !== "veo";
}

export function filterModelsForKey(
  groups: CatalogGroup[],
  allowedCategoryIds: string[],
  mode: ChatMode
): CatalogModel[] {
  const allowed = new Set(allowedCategoryIds);
  const models: CatalogModel[] = [];

  for (const group of groups) {
    if (!allowed.has(group.category.id)) continue;
    for (const model of group.models) {
      const apiKind = model.apiKind ?? "chat";
      if (modelMatchesMode(apiKind, mode)) {
        models.push({ ...model, apiKind });
      }
    }
  }

  return models;
}

export function pickDefaultModel(
  models: CatalogModel[],
  preferredId?: string | null
): string {
  if (preferredId && models.some((m) => m.id === preferredId)) {
    return preferredId;
  }
  return models[0]?.id ?? "";
}

export function modeLabel(mode: ChatMode): string {
  if (mode === "chat") return "对话";
  if (mode === "image") return "图像生成";
  return "视频生成";
}

export function modePlaceholder(mode: ChatMode): string {
  if (mode === "chat") return "输入消息，Enter 发送，Shift+Enter 换行…";
  if (mode === "image") return "描述你想生成的图像…";
  return "描述你想生成的视频（约需 1–2 分钟）…";
}
