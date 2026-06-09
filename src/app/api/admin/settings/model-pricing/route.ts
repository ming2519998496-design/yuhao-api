import { requireAdmin } from "@/lib/auth-admin";
import {
  pricingMatchesDefault,
  sanitizeModelPricing,
} from "@/lib/model-pricing-settings";
import {
  loadModelPricingAdminView,
  loadModelPricingOverrides,
  saveModelPricingOverrides,
} from "@/lib/model-pricing-store";
import { MODEL_LIST } from "@/lib/models";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const view = await loadModelPricingAdminView();
    return NextResponse.json(view);
  } catch (e) {
    const message = e instanceof Error ? e.message : "读取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    items?: { modelId?: string; pricing?: unknown }[];
    resetModelIds?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求体" }, { status: 400 });
  }

  const enabledIds = new Set(
    MODEL_LIST.filter((m) => m.enabled).map((m) => m.id)
  );

  try {
    const resetIds = new Set(
      (body.resetModelIds ?? []).filter(
        (id): id is string => typeof id === "string" && enabledIds.has(id)
      )
    );

    const { overrides: currentOverrides } = await loadModelPricingOverrides();
    const nextOverrides = { ...currentOverrides };
    for (const id of resetIds) {
      delete nextOverrides[id];
    }

    for (const item of body.items ?? []) {
      if (typeof item.modelId !== "string" || !enabledIds.has(item.modelId)) {
        continue;
      }
      const pricing = sanitizeModelPricing(item.pricing);
      if (!pricing) {
        return NextResponse.json(
          { error: `模型 ${item.modelId} 的价格无效，须为非负数且不超过 10000` },
          { status: 400 }
        );
      }

      const defaultModel = MODEL_LIST.find((m) => m.id === item.modelId);
      const isDefault =
        defaultModel &&
        pricingMatchesDefault(pricing, defaultModel.pricing);

      if (isDefault) {
        delete nextOverrides[item.modelId];
      } else {
        nextOverrides[item.modelId] = pricing;
      }
    }

    await saveModelPricingOverrides(nextOverrides, auth.user!.id);
    const view = await loadModelPricingAdminView();

    return NextResponse.json({
      success: true,
      message: "模型扣费价格已更新，立即对用户调用生效",
      ...view,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
