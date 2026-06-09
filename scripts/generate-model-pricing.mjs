/**
 * 遇好API 平台价生成：官方 USD × 7.2 × 分档加价
 * 运行：node scripts/generate-model-pricing.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const officialData = JSON.parse(
  readFileSync(join(root, "src/lib/pricing-official-data.json"), "utf8")
);

const FX = officialData.fx;
const MARKUP = officialData.markup;
const OFFICIAL = officialData.models;

function round2(n) {
  return Math.round(n * 100) / 100;
}

function compute(id, spec) {
  const m = 1 + MARKUP[spec.tier];
  if (spec.perRequestUsd != null) {
    return {
      inputPerMillion: 0,
      outputPerMillion: 0,
      perRequestYuan: round2(spec.perRequestUsd * FX * m),
      billingNote: "按张",
    };
  }
  if (spec.perSecondUsd != null) {
    const seconds = spec.defaultSeconds ?? 8;
    const usdPerRequest = spec.perSecondUsd * seconds;
    return {
      inputPerMillion: 0,
      outputPerMillion: 0,
      perRequestYuan: round2(usdPerRequest * FX * m),
      billingNote: `按次（${seconds} 秒 × $${spec.perSecondUsd}/秒）`,
    };
  }
  return {
    inputPerMillion: round2(spec.in * FX * m),
    outputPerMillion: round2(spec.out * FX * m),
  };
}

// Parse enabled models from MODEL_LIST only
const modelsTs = readFileSync(join(root, "src/lib/models.ts"), "utf8");
const modelListSection = modelsTs.slice(modelsTs.indexOf("export const MODEL_LIST"));

function parseEnabledModelIds(section) {
  const ids = [];
  const blocks = section.split(/\n  \},?\n/);
  for (const block of blocks) {
    const idMatch = block.match(/\bid: "([^"]+)"/);
    const enabledMatch = block.match(/\benabled: (true|false)/);
    if (idMatch && enabledMatch?.[1] === "true") {
      ids.push(idMatch[1]);
    }
  }
  return ids;
}

const enabledIds = parseEnabledModelIds(modelListSection);

const rows = [];
const pricingMap = {};

for (const id of enabledIds) {
  const spec = OFFICIAL[id];
  if (!spec) {
    console.warn("缺少官方 USD 配置:", id);
    continue;
  }
  const nameMatch = modelsTs.match(
    new RegExp(`id: "${id.replace(/\./g, "\\.")}"[\\s\\S]*?name: "([^"]+)"`)
  );
  const name = nameMatch?.[1] ?? id;
  const p = compute(id, spec);
  pricingMap[id] = p;

  if (p.perRequestYuan) {
    rows.push({
      modelId: id,
      name,
      inputPerMillion: 0,
      outputPerMillion: 0,
      perRequestYuan: p.perRequestYuan,
      tier: spec.tier,
    });
  } else {
    rows.push({
      modelId: id,
      name,
      inputPerMillion: p.inputPerMillion,
      outputPerMillion: p.outputPerMillion,
      tier: spec.tier,
    });
  }
}

// CSV：对话模型（可直接在后台「模型价格 → 导入」）
const tokenRows = rows.filter((r) => !r.perRequestYuan);
const csvLines = [
  "modelId,name,inputPerMillion,outputPerMillion",
  ...tokenRows.map(
    (r) =>
      `${r.modelId},"${r.name.replace(/"/g, '""')}",${r.inputPerMillion},${r.outputPerMillion}`
  ),
];
writeFileSync(join(root, "docs/yuhao-model-pricing.csv"), csvLines.join("\n") + "\n");

// 完整 CSV：含图像/视频按次价（perRequestYuan 为空则留空）
const allCsvLines = [
  "modelId,name,inputPerMillion,outputPerMillion,perRequestYuan",
  ...rows.map((r) => {
    const per =
      r.perRequestYuan != null && r.perRequestYuan > 0 ? r.perRequestYuan : "";
    return `${r.modelId},"${r.name.replace(/"/g, '""')}",${r.inputPerMillion},${r.outputPerMillion},${per}`;
  }),
];
writeFileSync(
  join(root, "docs/yuhao-model-pricing-all.csv"),
  allCsvLines.join("\n") + "\n"
);

writeFileSync(
  join(root, "docs/yuhao-model-pricing-full.json"),
  JSON.stringify(
    {
      formula: "官方 USD × 7.2 × 加价（经济15% / 标准20% / 旗舰18% / 图像按次30%）",
      generatedAt: new Date().toISOString(),
      models: rows,
    },
    null,
    2
  ) + "\n"
);

// Patch models.ts pricing blocks
let patched = modelsTs;
for (const [id, p] of Object.entries(pricingMap)) {
  const esc = id.replace(/\./g, "\\.");
  if (p.perRequestYuan) {
    const re = new RegExp(
      `(id: "${esc}"[\\s\\S]*?pricing: \\{) inputPerMillion: [^,]+, outputPerMillion: [^,]+, perRequestYuan: [^ }]+( \\})`,
      "m"
    );
    patched = patched.replace(
      re,
      `$1 inputPerMillion: 0, outputPerMillion: 0, perRequestYuan: ${p.perRequestYuan}$2`
    );
  } else {
    const re = new RegExp(
      `(id: "${esc}"[\\s\\S]*?pricing: \\{) inputPerMillion: [^,]+, outputPerMillion: [^}]+( \\})`,
      "m"
    );
    patched = patched.replace(
      re,
      `$1 inputPerMillion: ${p.inputPerMillion}, outputPerMillion: ${p.outputPerMillion}$2`
    );
  }
}

writeFileSync(join(root, "src/lib/models.ts"), patched);

console.log(`已生成 docs/yuhao-model-pricing.csv（${tokenRows.length} 个对话模型）`);
console.log(`已生成 docs/yuhao-model-pricing-all.csv（${rows.length} 个已上架模型，含按次价）`);
console.log(`已生成 docs/yuhao-model-pricing-full.json（含图像/视频按次价）`);
console.log(`已更新 src/lib/models.ts 默认价（${Object.keys(pricingMap).length} 个已上架模型）`);
console.log("\n主力模型平台价：");
for (const key of [
  "deepseek-v4-flash",
  "gpt-4o-mini",
  "gemini-2.5-flash",
  "gpt-4o",
  "deepseek-v4-pro",
]) {
  const p = pricingMap[key];
  if (p?.perRequestYuan) console.log(`  ${key}: ¥${p.perRequestYuan}/次`);
  else if (p) console.log(`  ${key}: 入 ${p.inputPerMillion} / 出 ${p.outputPerMillion}`);
}
