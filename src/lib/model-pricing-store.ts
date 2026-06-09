import {
  MODEL_LIST,
  type ModelConfig,
  type ModelCatalogGroup,
  MODEL_CATEGORIES,
  usesPerRequestPricing,
} from "@/lib/models";
import { resolveUpstreamBaseUrl } from "@/lib/upstream-fetch";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  mergeModelPricingMap,
  MODEL_PRICING_KEY,
  type ModelPricingMap,
} from "@/lib/model-pricing-settings";

function isMissingTableError(message: string) {
  return (
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

let cache: {
  overrides: ModelPricingMap;
  effective: ModelConfig[];
  updatedAt: string | null;
  expiresAt: number;
} | null = null;

const CACHE_TTL_MS = 60_000;

export function invalidateModelPricingCache() {
  cache = null;
}

function applyOverrides(overrides: ModelPricingMap): ModelConfig[] {
  return MODEL_LIST.filter((m) => m.enabled).map((m) => ({
    ...m,
    baseUrl: resolveUpstreamBaseUrl(m.provider, m.baseUrl),
    pricing: overrides[m.id] ?? m.pricing,
  }));
}

export async function loadModelPricingOverrides(): Promise<{
  overrides: ModelPricingMap;
  updatedAt: string | null;
}> {
  if (cache && cache.expiresAt > Date.now()) {
    return { overrides: cache.overrides, updatedAt: cache.updatedAt };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .select("value, updated_at")
    .eq("key", MODEL_PRICING_KEY)
    .maybeSingle();

  if (!error && data?.value) {
    const overrides = mergeModelPricingMap(data.value);
    const effective = applyOverrides(overrides);
    const updatedAt = data.updated_at ?? null;
    cache = {
      overrides,
      effective,
      updatedAt,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return { overrides, updatedAt };
  }

  if (error && !isMissingTableError(error.message)) {
    throw new Error(error.message);
  }

  cache = {
    overrides: {},
    effective: applyOverrides({}),
    updatedAt: null,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  return { overrides: {}, updatedAt: null };
}

async function getEffectiveModels(): Promise<ModelConfig[]> {
  await loadModelPricingOverrides();
  return cache!.effective;
}

export async function getEffectiveModelConfig(
  modelId: string
): Promise<ModelConfig | undefined> {
  const models = await getEffectiveModels();
  return models.find((m) => m.id === modelId);
}

export async function getEffectiveModelCatalog(): Promise<ModelCatalogGroup[]> {
  const enabled = await getEffectiveModels();
  return MODEL_CATEGORIES.map((category) => ({
    category,
    models: enabled
      .filter((m) => m.categoryId === category.id)
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
  })).filter((g) => g.models.length > 0);
}

export async function saveModelPricingOverrides(
  overrides: ModelPricingMap,
  userId: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("platform_settings").upsert({
    key: MODEL_PRICING_KEY,
    value: overrides,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  invalidateModelPricingCache();
}

/** 管理后台：默认价 + 当前生效价 + 是否已自定义 */
export async function loadModelPricingAdminView() {
  const { overrides, updatedAt } = await loadModelPricingOverrides();
  const models = MODEL_LIST.filter((m) => m.enabled).map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    categoryId: m.categoryId,
    perRequest: usesPerRequestPricing(m),
    defaultPricing: m.pricing,
    pricing: overrides[m.id] ?? m.pricing,
    customized: Boolean(overrides[m.id]),
  }));
  return { models, updatedAt };
}
