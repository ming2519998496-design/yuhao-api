"use client";

import {
  ALL_CATEGORY_IDS,
  getModelsForCategories,
} from "@/lib/api-key-models";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type CatalogGroup = {
  category: { id: string; name: string };
  models: { id: string; name: string }[];
};

export type TokenFormValues = {
  name: string;
  allowedCategoryIds: string[];
  defaultModelId: string;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  groups: CatalogGroup[];
  initial: TokenFormValues;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: TokenFormValues) => void;
};

export function TokenFormDialog({
  open,
  mode,
  groups,
  initial,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initial.name);
  const [selectedCategories, setSelectedCategories] = useState(
    initial.allowedCategoryIds
  );
  const [defaultModelId, setDefaultModelId] = useState(initial.defaultModelId);

  useEffect(() => {
    if (open) {
      setName(initial.name);
      setSelectedCategories(initial.allowedCategoryIds);
      setDefaultModelId(initial.defaultModelId);
    }
  }, [open, initial]);

  const modelOptions = useMemo(
    () => getModelsForCategories(selectedCategories),
    [selectedCategories]
  );

  useEffect(() => {
    if (!modelOptions.some((m) => m.id === defaultModelId)) {
      setDefaultModelId(modelOptions[0]?.id ?? "gpt-4o-mini");
    }
  }, [modelOptions, defaultModelId]);

  function toggleCategory(id: string) {
    setSelectedCategories((prev) => {
      const next = prev.includes(id)
        ? prev.filter((c) => c !== id)
        : [...prev, id];
      return next.length > 0 ? next : prev;
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface-elevated p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {mode === "create" ? "添加令牌" : "编辑令牌"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              设置名称、可用分组与模型选择
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-accent/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <label className="text-sm font-medium">名称</label>
            <input
              type="text"
              placeholder="如：GPT 项目专用"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          <div>
            <label className="text-sm font-medium">模型分组</label>
            <p className="mt-0.5 text-xs text-muted">
              全选即「无限制」，与 One API 展示一致
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {groups.map((g) => {
                const on = selectedCategories.includes(g.category.id);
                return (
                  <button
                    key={g.category.id}
                    type="button"
                    onClick={() => toggleCategory(g.category.id)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                      on
                        ? "border-accent bg-accent/10 text-accent-dark"
                        : "border-border text-muted hover:border-border-hover"
                    )}
                  >
                    {g.category.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">模型选择</label>
            <select
              value={defaultModelId}
              onChange={(e) => setDefaultModelId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/50"
            >
              {modelOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
          >
            取消
          </button>
          <button
            type="button"
            disabled={saving || selectedCategories.length === 0}
            onClick={() =>
              onSubmit({
                name: name.trim() || "默认密钥",
                allowedCategoryIds:
                  selectedCategories.length === groups.length
                    ? [...ALL_CATEGORY_IDS]
                    : selectedCategories,
                defaultModelId,
              })
            }
            className="rounded-xl bg-gradient-to-r from-accent to-accent-dark px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "保存中..." : mode === "create" ? "创建" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
