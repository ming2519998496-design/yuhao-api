import { requireAdmin } from "@/lib/auth-admin";
import {
  mergePricingImportIntoOverrides,
  parseModelPricingImport,
  type PricingImportParseResult,
} from "@/lib/model-pricing-import";
import {
  loadModelPricingAdminView,
  loadModelPricingOverrides,
  saveModelPricingOverrides,
} from "@/lib/model-pricing-store";
import { NextResponse } from "next/server";

function buildMessage(
  parse: PricingImportParseResult,
  dryRun: boolean,
  applied: number
): string {
  const parts: string[] = [];
  if (dryRun) {
    parts.push(`预览：可导入 ${parse.rows.length} 个模型`);
  } else {
    parts.push(`已导入 ${applied} 个模型价格，立即对用户调用生效`);
  }
  if (parse.unknownModelIds.length > 0) {
    parts.push(`跳过未知模型 ${parse.unknownModelIds.length} 个`);
  }
  if (parse.invalidRows.length > 0) {
    parts.push(`无效行 ${parse.invalidRows.length} 个`);
  }
  if (parse.duplicateModelIds.length > 0) {
    parts.push(`重复 modelId 以最后一次为准`);
  }
  return parts.join("；");
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    format?: string;
    content?: string;
    dryRun?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求体" }, { status: 400 });
  }

  const format = body.format === "json" ? "json" : body.format === "csv" ? "csv" : null;
  const content = typeof body.content === "string" ? body.content : "";
  const dryRun = Boolean(body.dryRun);

  if (!format) {
    return NextResponse.json(
      { error: "format 须为 csv 或 json" },
      { status: 400 }
    );
  }

  if (!content.trim()) {
    return NextResponse.json({ error: "content 不能为空" }, { status: 400 });
  }

  const parse = parseModelPricingImport(format, content);

  if (parse.rows.length === 0 && parse.invalidRows.length > 0) {
    return NextResponse.json(
      {
        error: parse.invalidRows[0]?.reason ?? "未能解析任何有效价格",
        parse,
      },
      { status: 400 }
    );
  }

  if (parse.rows.length === 0) {
    return NextResponse.json(
      { error: "文件中没有可导入的已上架模型价格" },
      { status: 400 }
    );
  }

  try {
    const { overrides: currentOverrides } = await loadModelPricingOverrides();
    const { nextOverrides, summary } = mergePricingImportIntoOverrides(
      currentOverrides,
      parse.rows
    );

    summary.skippedUnknown = [...new Set(parse.unknownModelIds)];
    summary.skippedInvalid = parse.invalidRows.length;

    if (!dryRun) {
      await saveModelPricingOverrides(nextOverrides, auth.user!.id);
    }

    const view = await loadModelPricingAdminView();

    const appliedCount =
      summary.updated.length + summary.resetToDefault.length;

    return NextResponse.json({
      success: true,
      dryRun,
      message: buildMessage(parse, dryRun, appliedCount),
      parse: {
        rowCount: parse.rows.length,
        unknownModelIds: summary.skippedUnknown,
        invalidRows: parse.invalidRows,
        duplicateModelIds: parse.duplicateModelIds,
        preview: parse.rows.map((r) => ({
          modelId: r.modelId,
          pricing: r.pricing,
        })),
      },
      summary,
      ...view,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "导入失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
