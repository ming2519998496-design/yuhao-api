import type { ModelPricing } from "@/lib/models";

export const MODEL_PRICING_KEY = "model_pricing";

export type ModelPricingMap = Record<string, ModelPricing>;

const MAX_PRICE = 10_000;

function roundPrice(n: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

export function sanitizeModelPricing(raw: unknown): ModelPricing | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const perRequestRaw = obj.perRequestYuan;
  const perRequest =
    perRequestRaw != null && perRequestRaw !== ""
      ? Number(perRequestRaw)
      : undefined;

  if (
    perRequest != null &&
    Number.isFinite(perRequest) &&
    perRequest > 0 &&
    perRequest <= MAX_PRICE
  ) {
    return {
      inputPerMillion: 0,
      outputPerMillion: 0,
      perRequestYuan: roundPrice(perRequest, 2),
    };
  }

  const input = Number(obj.inputPerMillion);
  const output = Number(obj.outputPerMillion);
  if (
    !Number.isFinite(input) ||
    !Number.isFinite(output) ||
    input < 0 ||
    output < 0 ||
    input > MAX_PRICE ||
    output > MAX_PRICE
  ) {
    return null;
  }
  return {
    inputPerMillion: roundPrice(input),
    outputPerMillion: roundPrice(output),
  };
}

export function pricingMatchesDefault(
  pricing: ModelPricing,
  defaultPricing: ModelPricing
): boolean {
  if (
    defaultPricing.perRequestYuan != null &&
    defaultPricing.perRequestYuan > 0
  ) {
    return pricing.perRequestYuan === defaultPricing.perRequestYuan;
  }
  return (
    pricing.inputPerMillion === defaultPricing.inputPerMillion &&
    pricing.outputPerMillion === defaultPricing.outputPerMillion
  );
}

export function mergeModelPricingMap(raw: unknown): ModelPricingMap {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const out: ModelPricingMap = {};
  for (const [modelId, value] of Object.entries(obj)) {
    const pricing = sanitizeModelPricing(value);
    if (pricing) out[modelId] = pricing;
  }
  return out;
}

export function buildModelPricingPayload(
  entries: { modelId: string; pricing: ModelPricing }[]
): ModelPricingMap {
  const out: ModelPricingMap = {};
  for (const { modelId, pricing } of entries) {
    const sanitized = sanitizeModelPricing(pricing);
    if (sanitized) out[modelId] = sanitized;
  }
  return out;
}
