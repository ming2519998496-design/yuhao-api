import { MODEL_LIST, type ModelPricing } from "@/lib/models";
import {
  pricingMatchesDefault,
  sanitizeModelPricing,
  type ModelPricingMap,
} from "@/lib/model-pricing-settings";

export type PricingImportRow = {
  modelId: string;
  pricing: ModelPricing;
  line?: number;
};

export type PricingImportParseResult = {
  rows: PricingImportRow[];
  unknownModelIds: string[];
  invalidRows: { line?: number; modelId?: string; reason: string }[];
  duplicateModelIds: string[];
};

export type PricingImportApplySummary = {
  updated: string[];
  resetToDefault: string[];
  skippedUnknown: string[];
  skippedInvalid: number;
};

const ID_HEADERS = new Set([
  "modelid",
  "model_id",
  "id",
  "model",
  "模型",
  "模型id",
  "模型名称id",
]);

const INPUT_HEADERS = new Set([
  "inputpermillion",
  "input_per_million",
  "input",
  "inputprice",
  "input_price",
  "输入",
  "输入价格",
  "输入元每百万tokens",
  "输入元/百万tokens",
]);

const OUTPUT_HEADERS = new Set([
  "outputpermillion",
  "output_per_million",
  "output",
  "outputprice",
  "output_price",
  "输出",
  "输出价格",
  "输出元每百万tokens",
  "输出元/百万tokens",
]);

const PER_REQUEST_HEADERS = new Set([
  "perrequestyuan",
  "per_request_yuan",
  "perrequest",
  "per_request",
  "按次",
  "按次价格",
  "元每次",
  "元/次",
]);

function normalizeHeader(value: string): string {
  return value
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[（）()]/g, "")
    .replace(/[/\\]/g, "");
}

function enabledModelIds(): Set<string> {
  return new Set(MODEL_LIST.filter((m) => m.enabled).map((m) => m.id));
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function rowFromRecord(
  record: Record<string, unknown>,
  line?: number
): PricingImportRow | null {
  const entries = Object.entries(record);
  let modelId = "";
  let inputRaw: unknown;
  let outputRaw: unknown;
  let perRequestRaw: unknown;

  for (const [key, value] of entries) {
    const norm = normalizeHeader(key);
    if (ID_HEADERS.has(norm) || norm === "modelid") {
      modelId = String(value ?? "").trim();
    } else if (INPUT_HEADERS.has(norm)) {
      inputRaw = value;
    } else if (OUTPUT_HEADERS.has(norm)) {
      outputRaw = value;
    } else if (PER_REQUEST_HEADERS.has(norm)) {
      perRequestRaw = value;
    }
  }

  if (!modelId && typeof record.modelId === "string") {
    modelId = record.modelId.trim();
  }

  const pricing = sanitizeModelPricing({
    inputPerMillion: inputRaw ?? record.inputPerMillion,
    outputPerMillion: outputRaw ?? record.outputPerMillion,
    perRequestYuan: perRequestRaw ?? record.perRequestYuan,
  });

  if (!modelId) {
    return null;
  }
  if (!pricing) {
    return null;
  }

  return { modelId, pricing, line };
}

export function parseModelPricingCsv(content: string): PricingImportParseResult {
  const enabledIds = enabledModelIds();
  const text = content.replace(/^\uFEFF/, "").trim();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  const rows: PricingImportRow[] = [];
  const unknownModelIds: string[] = [];
  const invalidRows: PricingImportParseResult["invalidRows"] = [];
  const seen = new Set<string>();
  const duplicateModelIds: string[] = [];

  if (lines.length === 0) {
    return {
      rows,
      unknownModelIds,
      invalidRows: [{ reason: "CSV 文件为空" }],
      duplicateModelIds,
    };
  }

  const headerCells = parseCsvLine(lines[0]).map(normalizeHeader);
  const idIdx = headerCells.findIndex((h) => ID_HEADERS.has(h) || h === "modelid");
  const inputIdx = headerCells.findIndex((h) => INPUT_HEADERS.has(h));
  const outputIdx = headerCells.findIndex((h) => OUTPUT_HEADERS.has(h));
  const perRequestIdx = headerCells.findIndex((h) => PER_REQUEST_HEADERS.has(h));

  if (idIdx < 0) {
    return {
      rows,
      unknownModelIds,
      invalidRows: [
        {
          line: 1,
          reason: "CSV 表头须包含 modelId（或 模型）",
        },
      ],
      duplicateModelIds,
    };
  }

  const hasTokenColumns = inputIdx >= 0 && outputIdx >= 0;
  const hasPerRequestColumn = perRequestIdx >= 0;

  if (!hasTokenColumns && !hasPerRequestColumn) {
    return {
      rows,
      unknownModelIds,
      invalidRows: [
        {
          line: 1,
          reason:
            "CSV 表头须包含 inputPerMillion/outputPerMillion，或 perRequestYuan（按次价）",
        },
      ],
      duplicateModelIds,
    };
  }

  const rowMap = new Map<string, PricingImportRow>();

  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    const cells = parseCsvLine(lines[i]);
    if (cells.every((c) => !c.trim())) continue;

    const modelId = (cells[idIdx] ?? "").trim();
    const pricing = sanitizeModelPricing({
      inputPerMillion: hasTokenColumns ? cells[inputIdx] : 0,
      outputPerMillion: hasTokenColumns ? cells[outputIdx] : 0,
      perRequestYuan: hasPerRequestColumn ? cells[perRequestIdx] : undefined,
    });

    if (!modelId) {
      invalidRows.push({ line: lineNo, reason: "缺少 modelId" });
      continue;
    }
    if (!pricing) {
      invalidRows.push({
        line: lineNo,
        modelId,
        reason: "价格无效（须为非负数且不超过 10000）",
      });
      continue;
    }
    if (!enabledIds.has(modelId)) {
      unknownModelIds.push(modelId);
      continue;
    }
    if (seen.has(modelId)) {
      duplicateModelIds.push(modelId);
    }
    seen.add(modelId);
    rowMap.set(modelId, { modelId, pricing, line: lineNo });
  }

  rows.push(...rowMap.values());

  return { rows, unknownModelIds, invalidRows, duplicateModelIds };
}

export function parseModelPricingJson(content: string): PricingImportParseResult {
  const enabledIds = enabledModelIds();
  const rows: PricingImportRow[] = [];
  const unknownModelIds: string[] = [];
  const invalidRows: PricingImportParseResult["invalidRows"] = [];
  const duplicateModelIds: string[] = [];
  const seen = new Set<string>();

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      rows,
      unknownModelIds,
      invalidRows: [{ reason: "JSON 格式无效" }],
      duplicateModelIds,
    };
  }

  const records: Record<string, unknown>[] = [];

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (item && typeof item === "object") {
        records.push(item as Record<string, unknown>);
      }
    }
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.items)) {
      for (const item of obj.items) {
        if (item && typeof item === "object") {
          records.push(item as Record<string, unknown>);
        }
      }
    } else {
      for (const [modelId, value] of Object.entries(obj)) {
        if (modelId === "items") continue;
        if (value && typeof value === "object") {
          records.push({
            modelId,
            ...(value as Record<string, unknown>),
          });
        }
      }
    }
  }

  if (records.length === 0) {
    return {
      rows,
      unknownModelIds,
      invalidRows: [{ reason: "JSON 中未找到可导入的模型价格" }],
      duplicateModelIds,
    };
  }

  const rowMap = new Map<string, PricingImportRow>();

  records.forEach((record, index) => {
    const row = rowFromRecord(record, index + 1);
    const modelId =
      row?.modelId ??
      String(record.modelId ?? record.model_id ?? record.id ?? "").trim();

    if (!row) {
      invalidRows.push({
        line: index + 1,
        modelId: modelId || undefined,
        reason: modelId ? "价格无效" : "缺少 modelId",
      });
      return;
    }

    if (!enabledIds.has(row.modelId)) {
      unknownModelIds.push(row.modelId);
      return;
    }
    if (seen.has(row.modelId)) {
      duplicateModelIds.push(row.modelId);
    }
    seen.add(row.modelId);
    rowMap.set(row.modelId, row);
  });

  rows.push(...rowMap.values());

  return { rows, unknownModelIds, invalidRows, duplicateModelIds };
}

export function parseModelPricingImport(
  format: "csv" | "json",
  content: string
): PricingImportParseResult {
  return format === "csv"
    ? parseModelPricingCsv(content)
    : parseModelPricingJson(content);
}

/** 将导入行合并进 overrides（与手动保存逻辑一致） */
export function mergePricingImportIntoOverrides(
  currentOverrides: ModelPricingMap,
  importRows: PricingImportRow[]
): { nextOverrides: ModelPricingMap; summary: PricingImportApplySummary } {
  const enabledIds = enabledModelIds();
  const nextOverrides = { ...currentOverrides };
  const updated: string[] = [];
  const resetToDefault: string[] = [];

  for (const row of importRows) {
    if (!enabledIds.has(row.modelId)) continue;

    const defaultModel = MODEL_LIST.find((m) => m.id === row.modelId);
    const isDefault =
      defaultModel &&
      pricingMatchesDefault(row.pricing, defaultModel.pricing);

    if (isDefault) {
      if (nextOverrides[row.modelId]) {
        delete nextOverrides[row.modelId];
        resetToDefault.push(row.modelId);
      }
    } else {
      nextOverrides[row.modelId] = row.pricing;
      updated.push(row.modelId);
    }
  }

  return {
    nextOverrides,
    summary: {
      updated,
      resetToDefault,
      skippedUnknown: [],
      skippedInvalid: 0,
    },
  };
}

export function buildModelPricingCsvTemplate(
  models: {
    id: string;
    name: string;
    pricing: ModelPricing;
  }[]
): string {
  const header = "modelId,name,inputPerMillion,outputPerMillion,perRequestYuan";
  const lines = models.map((m) => {
    const per =
      m.pricing.perRequestYuan != null && m.pricing.perRequestYuan > 0
        ? m.pricing.perRequestYuan
        : "";
    return `${m.id},"${m.name.replace(/"/g, '""')}",${m.pricing.inputPerMillion},${m.pricing.outputPerMillion},${per}`;
  });
  return [header, ...lines].join("\n");
}

export function buildModelPricingJsonTemplate(
  models: {
    id: string;
    pricing: ModelPricing;
  }[]
): string {
  const obj: ModelPricingMap = {};
  for (const m of models) {
    obj[m.id] = { ...m.pricing };
  }
  return JSON.stringify(obj, null, 2);
}
