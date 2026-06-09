import officialData from "@/lib/pricing-official-data.json";
import {
  MODEL_CATEGORIES,
  type ModelConfig,
  type ModelPricing,
  resolveModelChargeYuan,
  usesPerRequestPricing,
} from "@/lib/models";

export type PricingTierId = "economy" | "standard" | "flagship" | "image";

type OfficialSpec = {
  in?: number;
  out?: number;
  tier: PricingTierId;
  perRequestUsd?: number;
  perSecondUsd?: number;
  defaultSeconds?: number;
};

export type PricingTierInfo = {
  id: PricingTierId;
  label: string;
  markupPercent: number;
  summary: string;
};

export type TransparencyTokenRow = {
  id: string;
  name: string;
  tier: PricingTierInfo;
  officialInputUsd: number;
  officialOutputUsd: number;
  costInputCny: number;
  costOutputCny: number;
  platformInputCny: number;
  platformOutputCny: number;
};

export type TransparencyFixedRow = {
  id: string;
  name: string;
  tier: PricingTierInfo;
  officialLabel: string;
  costCny: number;
  platformCny: number;
  unitLabel: string;
  note?: string;
};

export type TransparencySection = {
  categoryId: string;
  categoryName: string;
  description: string;
  billingMode: "token" | "fixed";
  tokenRows?: TransparencyTokenRow[];
  fixedRows?: TransparencyFixedRow[];
};

export type FeaturedPricingExample = {
  id: string;
  name: string;
  vendor: string;
  tierLabel: string;
  markupPercent: number;
  lines: { label: string; value: string; highlight?: boolean }[];
};

const FX = officialData.fx;
const MARKUP = officialData.markup as Record<PricingTierId, number>;
const TIER_LABELS = officialData.tierLabels as Record<PricingTierId, string>;
const OFFICIAL = officialData.models as Record<string, OfficialSpec>;

const TIER_SUMMARY: Record<PricingTierId, string> = {
  economy: "DeepSeek Flash、Gemini Lite",
  standard: "GPT-4o Mini、Gemini Flash",
  flagship: "GPT-4o、Gemini Pro",
  image: "图像与视频生成",
};

export const PRICING_FX = FX;

export function getPricingTiers(): PricingTierInfo[] {
  return (Object.keys(MARKUP) as PricingTierId[]).map((id) => ({
    id,
    label: TIER_LABELS[id],
    markupPercent: Math.round(MARKUP[id] * 100),
    summary: TIER_SUMMARY[id],
  }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getTierInfo(tierId: PricingTierId): PricingTierInfo {
  return {
    id: tierId,
    label: TIER_LABELS[tierId],
    markupPercent: Math.round(MARKUP[tierId] * 100),
    summary: TIER_SUMMARY[tierId],
  };
}

function costCnyFromUsd(usd: number): number {
  return round2(usd * FX);
}

export function formatUsd(amount: number): string {
  if (amount >= 1) return `$${amount.toFixed(2)}`;
  return `$${amount.toFixed(3).replace(/0+$/, "").replace(/\.$/, ".0")}`;
}

export function formatCny(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

function officialUsdPerRequest(spec: OfficialSpec): number | null {
  if (spec.perRequestUsd != null) return spec.perRequestUsd;
  if (spec.perSecondUsd != null) {
    return spec.perSecondUsd * (spec.defaultSeconds ?? 8);
  }
  return null;
}

function officialLabel(spec: OfficialSpec): string {
  if (spec.perRequestUsd != null) {
    return `${formatUsd(spec.perRequestUsd)}/张`;
  }
  if (spec.perSecondUsd != null) {
    const sec = spec.defaultSeconds ?? 8;
    return `${formatUsd(spec.perSecondUsd)}/秒 × ${sec} 秒`;
  }
  return "";
}

function buildTokenRow(model: ModelConfig, spec: OfficialSpec): TransparencyTokenRow {
  const tier = getTierInfo(spec.tier);
  const inUsd = spec.in ?? 0;
  const outUsd = spec.out ?? 0;
  return {
    id: model.id,
    name: model.name,
    tier,
    officialInputUsd: inUsd,
    officialOutputUsd: outUsd,
    costInputCny: costCnyFromUsd(inUsd),
    costOutputCny: costCnyFromUsd(outUsd),
    platformInputCny: model.pricing.inputPerMillion,
    platformOutputCny: model.pricing.outputPerMillion,
  };
}

function buildFixedRow(model: ModelConfig, spec: OfficialSpec): TransparencyFixedRow {
  const tier = getTierInfo(spec.tier);
  const usd = officialUsdPerRequest(spec) ?? 0;
  const charge = resolveModelChargeYuan(model.pricing);
  const isVideo = Boolean(spec.perSecondUsd);
  return {
    id: model.id,
    name: model.name,
    tier,
    officialLabel: officialLabel(spec),
    costCny: costCnyFromUsd(usd),
    platformCny: charge,
    unitLabel: isVideo ? "元/次（8 秒）" : "元/张",
    note: isVideo ? "视频按次扣费，按默认 8 秒估算；官网实际按秒计费" : undefined,
  };
}

export function buildTransparencySections(
  models: ModelConfig[]
): TransparencySection[] {
  const enabled = models.filter((m) => m.enabled);
  const sections: TransparencySection[] = [];

  for (const category of MODEL_CATEGORIES) {
    const categoryModels = enabled.filter((m) => m.categoryId === category.id);
    if (!categoryModels.length) continue;

    const fixed = categoryModels.filter(usesPerRequestPricing);
    const token = categoryModels.filter((m) => !usesPerRequestPricing(m));

    if (fixed.length) {
      sections.push({
        categoryId: category.id,
        categoryName: category.name,
        description: category.description,
        billingMode: "fixed",
        fixedRows: fixed
          .map((m) => {
            const spec = OFFICIAL[m.id];
            if (!spec) return null;
            return buildFixedRow(m, spec);
          })
          .filter((r): r is TransparencyFixedRow => r != null),
      });
      continue;
    }

    sections.push({
      categoryId: category.id,
      categoryName: category.name,
      description: category.description,
      billingMode: "token",
      tokenRows: token
        .map((m) => {
          const spec = OFFICIAL[m.id];
          if (!spec) return null;
          return buildTokenRow(m, spec);
        })
        .filter((r): r is TransparencyTokenRow => r != null),
    });
  }

  return sections;
}

function exampleLines(
  spec: OfficialSpec,
  platform: ModelPricing
): FeaturedPricingExample["lines"] {
  const tier = getTierInfo(spec.tier);
  if (spec.perRequestUsd != null) {
    const usd = spec.perRequestUsd;
    return [
      { label: "官方价", value: `${formatUsd(usd)}/张` },
      { label: "× 汇率", value: String(FX) },
      { label: "成本价", value: formatCny(costCnyFromUsd(usd)) },
      { label: "+ 服务费", value: `${tier.markupPercent}%（${tier.label}）` },
      {
        label: "您支付",
        value: `${formatCny(resolveModelChargeYuan(platform))}/张`,
        highlight: true,
      },
    ];
  }

  const inUsd = spec.in ?? 0;
  const outUsd = spec.out ?? 0;
  return [
    {
      label: "官方价",
      value: `${formatUsd(inUsd)} / ${formatUsd(outUsd)}（每百万 tokens）`,
    },
    { label: "× 汇率", value: String(FX) },
    {
      label: "成本价",
      value: `${formatCny(costCnyFromUsd(inUsd))} / ${formatCny(costCnyFromUsd(outUsd))}`,
    },
    { label: "+ 服务费", value: `${tier.markupPercent}%（${tier.label}）` },
    {
      label: "您支付",
      value: `${formatCny(platform.inputPerMillion)} / ${formatCny(platform.outputPerMillion)}`,
      highlight: true,
    },
  ];
}

const FEATURED_IDS = [
  "gpt-4o-mini",
  "gemini-2.5-flash",
  "deepseek-v4-flash",
  "gpt-4o",
] as const;

export function buildFeaturedExamples(
  models: ModelConfig[]
): FeaturedPricingExample[] {
  const examples: FeaturedPricingExample[] = [];

  for (const id of FEATURED_IDS) {
    const model = models.find((m) => m.id === id && m.enabled);
    const spec = OFFICIAL[id];
    if (!model || !spec) continue;
    const tier = getTierInfo(spec.tier);
    const vendor =
      model.provider === "openai"
        ? "OpenAI"
        : model.provider === "google"
          ? "Google"
          : "DeepSeek";
    examples.push({
      id,
      name: model.name,
      vendor,
      tierLabel: tier.label,
      markupPercent: tier.markupPercent,
      lines: exampleLines(spec, model.pricing),
    });
  }

  return examples;
}

/** 与后台扣费一致的公式说明 */
export function getPricingFormulaText(): string {
  return "平台价 = 官方美元价 × 7.2 ×（1 + 服务费率）";
}
