"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import {
  buildModelPricingCsvTemplate,
  buildModelPricingJsonTemplate,
} from "@/lib/model-pricing-import";
import { MODEL_CATEGORIES } from "@/lib/models";
import { Download, FileUp, RotateCcw, Save, Tags } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PricingRow = {
  id: string;
  name: string;
  provider: string;
  categoryId: string;
  perRequest: boolean;
  defaultPricing: {
    inputPerMillion: number;
    outputPerMillion: number;
    perRequestYuan?: number;
  };
  pricing: {
    inputPerMillion: number;
    outputPerMillion: number;
    perRequestYuan?: number;
  };
  customized: boolean;
};

function pricingChanged(row: PricingRow): boolean {
  if (row.perRequest) {
    return row.pricing.perRequestYuan !== row.defaultPricing.perRequestYuan;
  }
  return (
    row.pricing.inputPerMillion !== row.defaultPricing.inputPerMillion ||
    row.pricing.outputPerMillion !== row.defaultPricing.outputPerMillion
  );
}

export default function AdminModelPricingPage() {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importFormat, setImportFormat] = useState<"csv" | "json" | null>(null);
  const [importContent, setImportContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings/model-pricing");
    const data = await res.json();
    if (res.ok) {
      setRows(data.models ?? []);
      setUpdatedAt(data.updatedAt ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    return MODEL_CATEGORIES.map((category) => ({
      category,
      models: rows.filter((r) => r.categoryId === category.id),
    })).filter((g) => g.models.length > 0);
  }, [rows]);

  function updateRow(
    modelId: string,
    field: "inputPerMillion" | "outputPerMillion" | "perRequestYuan",
    value: string
  ) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== modelId) return row;
        const num = value === "" ? 0 : Number(value);
        if (field === "perRequestYuan") {
          return {
            ...row,
            pricing: {
              inputPerMillion: 0,
              outputPerMillion: 0,
              perRequestYuan: Number.isFinite(num) ? num : row.pricing.perRequestYuan,
            },
          };
        }
        return {
          ...row,
          pricing: {
            ...row.pricing,
            [field]: Number.isFinite(num) ? num : row.pricing[field],
          },
        };
      })
    );
  }

  function resetRow(modelId: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== modelId) return row;
        return {
          ...row,
          pricing: { ...row.defaultPricing },
          customized: false,
        };
      })
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/settings/model-pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: rows.map((r) => ({
          modelId: r.id,
          pricing: r.pricing,
        })),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error || "保存失败");
      return;
    }
    setRows(data.models ?? []);
    setUpdatedAt(data.updatedAt ?? null);
    setMessage(data.message ?? "保存成功");
  }

  function downloadTemplate(format: "csv" | "json") {
    const payload = rows.map((r) => ({
      id: r.id,
      name: r.name,
      pricing: r.pricing,
    }));
    const content =
      format === "csv"
        ? buildModelPricingCsvTemplate(payload)
        : buildModelPricingJsonTemplate(payload);
    const blob = new Blob([content], {
      type: format === "csv" ? "text/csv;charset=utf-8" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      format === "csv"
        ? "yuhao-model-pricing.csv"
        : "yuhao-model-pricing.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileSelect(file: File | null) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    const format = lower.endsWith(".json")
      ? "json"
      : lower.endsWith(".csv")
        ? "csv"
        : null;

    if (!format) {
      setMessage("仅支持 .csv 或 .json 文件");
      return;
    }

    const content = await file.text();
    setImportFileName(file.name);
    setImportFormat(format);
    setImportContent(content);
    setMessage(`已选择 ${file.name}，点击「导入并生效」批量更新价格`);
  }

  async function handleImport(dryRun: boolean) {
    if (!importFormat || !importContent.trim()) {
      setMessage("请先选择 CSV 或 JSON 文件");
      return;
    }

    setImporting(true);
    setMessage("");
    const res = await fetch("/api/admin/settings/model-pricing/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: importFormat,
        content: importContent,
        dryRun,
      }),
    });
    const data = await res.json();
    setImporting(false);

    if (!res.ok) {
      setMessage(data.error || "导入失败");
      return;
    }

    if (dryRun) {
      const preview = (data.parse?.preview ?? []) as {
        modelId: string;
        pricing: { inputPerMillion: number; outputPerMillion: number };
      }[];
      const previewMap = new Map(preview.map((p) => [p.modelId, p.pricing]));
      setRows((prev) =>
        prev.map((row) =>
          previewMap.has(row.id)
            ? { ...row, pricing: previewMap.get(row.id)! }
            : row
        )
      );
      setMessage(`${data.message}（尚未保存，可继续编辑或点「导入并生效」）`);
      return;
    }

    setRows(data.models ?? []);
    setUpdatedAt(data.updatedAt ?? null);
    setImportFileName("");
    setImportFormat(null);
    setImportContent("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setMessage(data.message ?? "导入成功");
  }

  return (
    <AdminShell
      title="模型扣费价格"
      description="对话模型按 tokens 扣费；Google 图像/视频按次扣费（元/次）。保存后立即对用户调用与前台价目生效"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <FileUp className="h-5 w-5 text-accent" />
            批量导入
          </h2>
          <p className="mt-1 text-sm text-muted">
            上传 CSV 或 JSON 批量更新模型价格。对话模型填 input/output；图像/视频填 perRequestYuan（元/次）。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => downloadTemplate("csv")}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-accent/5 hover:text-foreground"
            >
              <Download className="h-4 w-4" />
              下载 CSV 模板
            </button>
            <button
              type="button"
              onClick={() => downloadTemplate("json")}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-accent/5 hover:text-foreground"
            >
              <Download className="h-4 w-4" />
              下载 JSON 模板
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={(e) => void handleFileSelect(e.target.files?.[0] ?? null)}
              className="block max-w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent"
            />
            <button
              type="button"
              disabled={importing || !importContent}
              onClick={() => void handleImport(true)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-accent/5 hover:text-foreground disabled:opacity-50"
            >
              {importing ? "处理中..." : "预览导入"}
            </button>
            <button
              type="button"
              disabled={importing || !importContent}
              onClick={() => void handleImport(false)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-dark px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:brightness-110 disabled:opacity-50"
            >
              <FileUp className="h-4 w-4" />
              {importing ? "导入中..." : "导入并生效"}
            </button>
          </div>
          {importFileName && (
            <p className="mt-2 text-xs text-muted">已选文件：{importFileName}</p>
          )}
          <pre className="mt-3 overflow-x-auto rounded-lg bg-background/80 p-3 text-xs text-muted">
{`CSV 表头示例：
modelId,name,inputPerMillion,outputPerMillion,perRequestYuan
gpt-4o-mini,GPT-4o Mini,1.3,5.18,
gemini-2.5-flash-image,Gemini 2.5 Flash Image,0,0,0.37

JSON 示例：
{
  "gpt-4o-mini": { "inputPerMillion": 1.3, "outputPerMillion": 5.18 },
  "gemini-2.5-flash-image": { "perRequestYuan": 0.37 }
}`}
          </pre>
        </div>

        <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <Tags className="h-5 w-5 text-accent" />
            价目表
          </h2>
          <p className="mt-1 text-sm text-muted">
            对话模型：（输入 tokens + 输出 tokens 分别按单价折算）合计后最低扣 ¥0.01。
            图像按张、视频按次（默认按 8 秒/次估算，官网按秒计费）。
            未自定义的模型使用代码内置默认价。
          </p>
          {updatedAt && (
            <p className="mt-2 text-xs text-muted">
              最近更新：{new Date(updatedAt).toLocaleString("zh-CN")}
            </p>
          )}

          {loading ? (
            <p className="mt-6 text-sm text-muted">加载中...</p>
          ) : (
            <div className="mt-6 space-y-8">
              {grouped.map(({ category, models }) => {
                const fixedCharge = models.every((m) => m.perRequest);
                return (
                <div key={category.id}>
                  <h3 className="text-sm font-semibold text-foreground">
                    {category.name}
                  </h3>
                  <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="border-b border-border bg-background/60 text-left text-xs text-muted">
                        <tr>
                          <th className="px-4 py-3 font-medium">模型</th>
                          {fixedCharge ? (
                            <>
                              <th className="px-4 py-3 font-medium">
                                扣费单价（元/次）
                              </th>
                              <th className="px-4 py-3 font-medium">默认价</th>
                            </>
                          ) : (
                            <>
                              <th className="px-4 py-3 font-medium">
                                输入（元/百万 tokens）
                              </th>
                              <th className="px-4 py-3 font-medium">
                                输出（元/百万 tokens）
                              </th>
                              <th className="px-4 py-3 font-medium">默认价</th>
                            </>
                          )}
                          <th className="px-4 py-3 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {models.map((row) => {
                          const changed = pricingChanged(row);
                          return (
                            <tr
                              key={row.id}
                              className="border-b border-border last:border-0"
                            >
                              <td className="px-4 py-3">
                                <div className="font-medium">{row.name}</div>
                                <div className="text-xs text-muted">{row.id}</div>
                                {row.perRequest && (
                                  <div className="mt-1 text-[10px] text-muted">
                                    {row.categoryId === "google-video"
                                      ? "按次扣费（含默认 8 秒）"
                                      : "按张扣费"}
                                  </div>
                                )}
                                {changed && (
                                  <span className="mt-1 inline-block rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                                    已调整
                                  </span>
                                )}
                              </td>
                              {row.perRequest ? (
                                <>
                                  <td className="px-4 py-3">
                                    <input
                                      type="number"
                                      min={0}
                                      step={0.01}
                                      value={row.pricing.perRequestYuan ?? 0}
                                      onChange={(e) =>
                                        updateRow(
                                          row.id,
                                          "perRequestYuan",
                                          e.target.value
                                        )
                                      }
                                      className="w-28 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-accent/50"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted">
                                    ¥{row.defaultPricing.perRequestYuan ?? 0}/次
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-3">
                                    <input
                                      type="number"
                                      min={0}
                                      step={0.01}
                                      value={row.pricing.inputPerMillion}
                                      onChange={(e) =>
                                        updateRow(
                                          row.id,
                                          "inputPerMillion",
                                          e.target.value
                                        )
                                      }
                                      className="w-28 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-accent/50"
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <input
                                      type="number"
                                      min={0}
                                      step={0.01}
                                      value={row.pricing.outputPerMillion}
                                      onChange={(e) =>
                                        updateRow(
                                          row.id,
                                          "outputPerMillion",
                                          e.target.value
                                        )
                                      }
                                      className="w-28 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-accent/50"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted">
                                    入 ¥{row.defaultPricing.inputPerMillion}
                                    <br />
                                    出 ¥{row.defaultPricing.outputPerMillion}
                                  </td>
                                </>
                              )}
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => resetRow(row.id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-accent/5 hover:text-foreground"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  恢复默认
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
              })}
            </div>
          )}

          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void handleSave()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-dark px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:brightness-110 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "保存中..." : "保存全部价格"}
          </button>
        </div>

        {message && (
          <p
            className={`text-sm ${
              message.includes("失败") || message.includes("无效")
                ? "text-red-500"
                : "text-emerald-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </AdminShell>
  );
}
