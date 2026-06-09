import {
  getEnabledModels,
  getModelConfig,
  MODEL_CATEGORIES,
} from "@/lib/models";

/** 未配置分组权限时的默认值（兼容旧 Key） */
export const ALL_CATEGORY_IDS = MODEL_CATEGORIES.map((c) => c.id);

export const DEFAULT_MODEL_ID = "gpt-4o-mini";

export function normalizeAllowedCategoryIds(ids: unknown): string[] | null {
  if (!Array.isArray(ids) || ids.length === 0) return null;
  const valid = new Set(ALL_CATEGORY_IDS);
  const filtered = [
    ...new Set(
      ids.filter(
        (id): id is string => typeof id === "string" && valid.has(id)
      )
    ),
  ];
  return filtered.length > 0 ? filtered : null;
}

export function resolveAllowedCategoryIds(
  stored: string[] | null | undefined
): string[] {
  const normalized = normalizeAllowedCategoryIds(stored);
  return normalized ?? [...ALL_CATEGORY_IDS];
}

export function getModelsForCategories(categoryIds: string[]) {
  const set = new Set(categoryIds);
  return getEnabledModels().filter((m) => set.has(m.categoryId));
}

export function isModelAllowedForKey(
  modelId: string,
  allowedCategoryIds: string[]
): boolean {
  const config = getModelConfig(modelId);
  if (!config) return false;
  return allowedCategoryIds.includes(config.categoryId);
}

export function validateKeyModelConfig(
  defaultModelId: string,
  allowedCategoryIds: string[]
): { ok: true } | { ok: false; error: string } {
  if (!allowedCategoryIds.length) {
    return { ok: false, error: "请至少选择一个模型分组" };
  }
  const config = getModelConfig(defaultModelId);
  if (!config) {
    return { ok: false, error: "默认模型无效或已下线" };
  }
  if (!allowedCategoryIds.includes(config.categoryId)) {
    return { ok: false, error: "默认模型须属于已选分组" };
  }
  return { ok: true };
}

export function formatCategoryLabels(categoryIds: string[]): string {
  return MODEL_CATEGORIES.filter((c) => categoryIds.includes(c.id))
    .map((c) => c.name)
    .join("、");
}

export function isAllCategoriesAllowed(categoryIds: string[]): boolean {
  return ALL_CATEGORY_IDS.every((id) => categoryIds.includes(id));
}

/** 表格「可用模型」列展示 */
export function formatAvailableModelsLabel(
  categoryIds: string[],
  defaultModelId: string | null
): string {
  if (isAllCategoriesAllowed(categoryIds)) return "无限制";
  const models = getModelsForCategories(categoryIds);
  if (models.length <= 4) {
    return models.map((m) => m.name).join("、");
  }
  const defName = defaultModelId
    ? getModelConfig(defaultModelId)?.name
    : null;
  return defName
    ? `${defName} 等 ${models.length} 个`
    : `${models.length} 个模型`;
}
