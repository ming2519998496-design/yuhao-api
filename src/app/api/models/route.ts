import {
  formatPriceYuan,
  getModelApiKind,
  resolveModelChargeYuan,
} from "@/lib/models";
import { getEffectiveModelCatalog } from "@/lib/model-pricing-store";
import { NextResponse } from "next/server";

/** 公开模型目录（按厂商分类，价格与扣费一致） */
export async function GET() {
  const groups = (await getEffectiveModelCatalog()).map((g) => ({
    category: {
      id: g.category.id,
      name: g.category.name,
      description: g.category.description,
    },
    models: g.models.map((m) => {
      const apiKind = getModelApiKind(m);
      const perRequest = resolveModelChargeYuan(m.pricing);
      return {
        id: m.id,
        name: m.name,
        provider: m.provider,
        description: m.description,
        apiKind,
        pricing: m.pricing,
        inputPriceHint:
          perRequest > 0
            ? `¥${perRequest.toFixed(2)}/次`
            : formatPriceYuan(m.pricing.inputPerMillion),
        outputPriceHint:
          perRequest > 0 ? "—" : formatPriceYuan(m.pricing.outputPerMillion),
        priceUnit: perRequest > 0 ? "元 / 次" : "元 / 百万 tokens",
      };
    }),
  }));

  return NextResponse.json({ groups });
}
