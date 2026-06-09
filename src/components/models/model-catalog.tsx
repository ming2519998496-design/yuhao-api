"use client";

import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

type CatalogModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  inputPriceHint?: string;
  outputPriceHint?: string;
};

type CatalogGroup = {
  category: { id: string; name: string; description: string };
  models: CatalogModel[];
};

const STORAGE_KEY = "yuhao_selected_model";

export function getStoredModelId(): string {
  if (typeof window === "undefined") return "gpt-4o-mini";
  return localStorage.getItem(STORAGE_KEY) ?? "gpt-4o-mini";
}

export function setStoredModelId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, id);
}

export function ModelCatalog({
  compact,
  onSelect,
}: {
  compact?: boolean;
  onSelect?: (modelId: string) => void;
}) {
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [selectedId, setSelectedId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(getStoredModelId());
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        const g = (data.groups ?? []) as CatalogGroup[];
        setGroups(g);
        if (g.length) setActiveCategory(g[0].category.id);
      })
      .finally(() => setLoading(false));
  }, []);

  function selectModel(id: string) {
    setSelectedId(id);
    setStoredModelId(id);
    onSelect?.(id);
  }

  async function copyModelId(id: string) {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const activeGroup = groups.find((g) => g.category.id === activeCategory);

  if (loading) {
    return <p className="text-sm text-muted">加载模型列表...</p>;
  }

  if (!groups.length) {
    return <p className="text-sm text-muted">暂无可用模型</p>;
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {!compact && (
        <p className="text-sm text-muted">
          按厂商分类浏览模型，选择后将作为默认调用模型（保存在本浏览器）。
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <button
            key={g.category.id}
            type="button"
            onClick={() => setActiveCategory(g.category.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-all",
              activeCategory === g.category.id
                ? "border-accent bg-accent/10 text-accent-dark"
                : "border-border bg-surface-elevated text-muted hover:border-border-hover"
            )}
          >
            {g.category.name}
          </button>
        ))}
      </div>

      {activeGroup && (
        <div>
          <p className="text-xs text-muted">{activeGroup.category.description}</p>
          <div
            className={cn(
              "mt-4 grid gap-3",
              compact ? "sm:grid-cols-1" : "sm:grid-cols-2"
            )}
          >
            {activeGroup.models.map((m) => {
              const selected = selectedId === m.id;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-2xl border p-4 transition-all",
                    selected
                      ? "border-accent bg-accent/5 shadow-sm"
                      : "border-border bg-surface-elevated hover:border-border-hover"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{m.name}</h3>
                      <code className="mt-1 block truncate font-mono text-xs text-muted">
                        {m.id}
                      </code>
                    </div>
                    {selected && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-dark">
                        <Check className="h-3 w-3" />
                        已选
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {m.description}
                  </p>
                  {(m.inputPriceHint || m.outputPriceHint) && (
                    <p className="mt-2 text-xs text-muted">
                      平台计费：输入 {m.inputPriceHint ?? "—"}，输出{" "}
                      {m.outputPriceHint ?? "—"}（元 / 百万 tokens，与扣费一致）
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => selectModel(m.id)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        selected
                          ? "bg-accent text-white"
                          : "bg-accent/10 text-accent-dark hover:bg-accent/15"
                      )}
                    >
                      {selected ? "当前默认" : "设为默认"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyModelId(m.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedId === m.id ? "已复制" : "复制 ID"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
