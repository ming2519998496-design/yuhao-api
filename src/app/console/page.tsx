"use client";

import {
  TokenFormDialog,
  type CatalogGroup,
  type TokenFormValues,
} from "@/components/console/token-form-dialog";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { setStoredModelId } from "@/components/models/model-catalog";
import {
  ALL_CATEGORY_IDS,
  formatAvailableModelsLabel,
  formatCategoryLabels,
  resolveAllowedCategoryIds,
} from "@/lib/api-key-models";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Code2,
  Copy,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface ApiKeyItem {
  id: string;
  key_prefix: string;
  name: string;
  balance: number;
  total_usage: number;
  is_active: boolean;
  allowed_category_ids: string[] | null;
  default_model_id: string | null;
  created_at: string;
  last_used_at: string | null;
}

function formatTime(iso: string | null): string {
  if (!iso) return "从未使用";
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const emptyForm: TokenFormValues = {
  name: "",
  allowedCategoryIds: [...ALL_CATEGORY_IDS],
  defaultModelId: "gpt-4o-mini",
};

export default function ConsolePage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<TokenFormValues>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newKeyMeta, setNewKeyMeta] = useState<TokenFormValues | null>(null);
  const [exampleModel, setExampleModel] = useState("gpt-4o-mini");
  const [devGuideOpen, setDevGuideOpen] = useState(false);
  const [schemaReady, setSchemaReady] = useState(true);
  const [migrationHint, setMigrationHint] = useState("");

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => setGroups(data.groups ?? []));
    fetchKeys();

    function onFocus() {
      void fetchKeys();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  async function fetchKeys() {
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      if (data.keys) {
        setKeys(data.keys);
        setSchemaReady(data.schemaReady !== false);
        setMigrationHint(data.migrationHint ?? "");
        const first = data.keys[0] as ApiKeyItem | undefined;
        if (first?.default_model_id) {
          setExampleModel(first.default_model_id);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const filteredKeys = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return keys;
    return keys.filter((k) => {
      const cats = resolveAllowedCategoryIds(k.allowed_category_ids);
      return (
        k.name.toLowerCase().includes(q) ||
        k.key_prefix.toLowerCase().includes(q) ||
        (k.default_model_id ?? "").toLowerCase().includes(q) ||
        formatCategoryLabels(cats).toLowerCase().includes(q)
      );
    });
  }, [keys, search]);

  const apiBaseUrl = useMemo(() => {
    const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const origin = site
      ? (site.startsWith("http") ? site : `https://${site}`).replace(/\/$/, "")
      : "https://yuhaoapi.com";
    return `${origin}/v1`;
  }, []);

  function openCreate() {
    setDialogMode("create");
    setEditingId(null);
    setFormInitial(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(key: ApiKeyItem) {
    setDialogMode("edit");
    setEditingId(key.id);
    setFormInitial({
      name: key.name,
      allowedCategoryIds: resolveAllowedCategoryIds(key.allowed_category_ids),
      defaultModelId: key.default_model_id ?? "gpt-4o-mini",
    });
    setDialogOpen(true);
  }

  async function handleFormSubmit(values: TokenFormValues) {
    setSaving(true);
    try {
      if (dialogMode === "create") {
        const res = await fetch("/api/keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            allowedCategoryIds: values.allowedCategoryIds,
            defaultModelId: values.defaultModelId,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(
            (data as { error?: string }).error ||
              `创建失败（HTTP ${res.status}）`
          );
          return;
        }
        if ((data as { key?: string }).key) {
          setNewKey((data as { key: string }).key);
          setNewKeyMeta(values);
          setExampleModel(values.defaultModelId);
          setDialogOpen(false);
          void fetchKeys();
        } else {
          alert((data as { error?: string }).error || "创建失败");
        }
      } else if (editingId) {
        const res = await fetch("/api/keys", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            name: values.name,
            allowedCategoryIds: values.allowedCategoryIds,
            defaultModelId: values.defaultModelId,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(
            (data as { error?: string }).error ||
              `保存失败（HTTP ${res.status}）`
          );
          return;
        }
        if ((data as { success?: boolean }).success) {
          setDialogOpen(false);
          void fetchKeys();
        } else {
          alert((data as { error?: string }).error || "保存失败");
        }
      }
    } catch (e) {
      alert(
        e instanceof Error
          ? `网络错误：${e.message}`
          : "请求失败，请确认本地服务 npm run dev 是否在运行"
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(key: ApiKeyItem) {
    const res = await fetch("/api/keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: key.id, isActive: !key.is_active }),
    });
    const data = await res.json();
    if (data.success) fetchKeys();
    else alert(data.error || "操作失败");
  }

  async function deleteKey(id: string) {
    if (!confirm("确定删除此令牌？")) return;
    const res = await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) fetchKeys();
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    alert(`已复制${label}`);
  }

  function openPlayground(key: ApiKeyItem) {
    const model = key.default_model_id ?? "gpt-4o-mini";
    setStoredModelId(model);
  }

  return (
    <DashboardShell
      title="令牌管理"
      description="管理 API 密钥、模型权限与余额"
    >
      <div className="mx-auto max-w-6xl space-y-4">
        {!schemaReady && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">令牌模型权限尚未初始化</p>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              {migrationHint ||
                "请在 Supabase SQL Editor 中 Create a new snippet，Run supabase-api-key-models.sql（见 docs/supabase-sql-editor-only.md）。"}
              完成前仍可创建密钥，但「可用模型 / 默认模型」列需迁移后才准确。
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-dark px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              添加令牌
            </button>
          </div>
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              placeholder="搜索名称、密钥前缀…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        </div>

        {newKey && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-700">
              新令牌已创建，请立即复制保存（仅显示一次）
            </p>
            {newKeyMeta && (
              <p className="mt-1 text-xs text-emerald-800/90">
                {newKeyMeta.name} · 默认模型 {newKeyMeta.defaultModelId}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-background px-3 py-2 font-mono text-xs">
                {newKey}
              </code>
              <button
                type="button"
                onClick={() => copyText(newKey, "密钥")}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              >
                <Copy className="h-4 w-4" />
                复制密钥
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewKey("");
                  setNewKeyMeta(null);
                }}
                className="text-xs text-muted hover:text-foreground"
              >
                关闭
              </button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/80 text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">名称</th>
                  <th className="px-4 py-3 font-medium">可用模型</th>
                  <th className="px-4 py-3 font-medium">分组</th>
                  <th className="px-4 py-3 font-medium">密钥</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">消费金额</th>
                  <th className="px-4 py-3 font-medium">创建时间</th>
                  <th className="px-4 py-3 font-medium">最后使用</th>
                  <th className="px-4 py-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-muted"
                    >
                      加载中...
                    </td>
                  </tr>
                ) : filteredKeys.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-muted"
                    >
                      {keys.length === 0
                        ? "暂无令牌，点击「添加令牌」创建"
                        : "没有匹配的令牌"}
                    </td>
                  </tr>
                ) : (
                  filteredKeys.map((key) => {
                    const cats = resolveAllowedCategoryIds(
                      key.allowed_category_ids
                    );
                    return (
                      <tr
                        key={key.id}
                        className="border-b border-border/80 last:border-0 hover:bg-accent/[0.03]"
                      >
                        <td className="px-4 py-3 font-medium">{key.name}</td>
                        <td className="max-w-[140px] px-4 py-3 text-muted">
                          {formatAvailableModelsLabel(
                            cats,
                            key.default_model_id
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {cats.map((cid) => {
                              const label =
                                groups
                                  .find((g) => g.category.id === cid)
                                  ?.category.name.split("·")[0]
                                  .trim() ?? cid;
                              return (
                                <span
                                  key={cid}
                                  className="rounded-md bg-accent/10 px-2 py-0.5 text-xs text-accent-dark"
                                >
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <code className="font-mono text-xs text-muted">
                              {key.key_prefix}
                            </code>
                            <button
                              type="button"
                              title="复制前缀（完整密钥仅在创建时显示）"
                              onClick={() => copyText(key.key_prefix, "前缀")}
                              className="rounded p-1 text-muted hover:bg-accent/10 hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              key.is_active
                                ? "bg-emerald-500/15 text-emerald-700"
                                : "bg-red-500/10 text-red-600"
                            )}
                          >
                            {key.is_active ? "已启用" : "已禁用"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="font-medium text-foreground">
                            ¥{key.total_usage.toFixed(2)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                          {formatTime(key.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                          {formatTime(key.last_used_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/playground?model=${encodeURIComponent(key.default_model_id ?? "gpt-4o-mini")}`}
                              onClick={() => openPlayground(key)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted hover:border-accent/40 hover:text-accent-dark"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              聊天
                            </Link>
                            <button
                              type="button"
                              onClick={() => toggleActive(key)}
                              className={cn(
                                "rounded-lg px-2 py-1 text-xs",
                                key.is_active
                                  ? "text-red-600 hover:bg-red-500/10"
                                  : "text-emerald-700 hover:bg-emerald-500/10"
                              )}
                            >
                              {key.is_active ? "禁用" : "启用"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(key)}
                              className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-accent/10 hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteKey(key.id)}
                              className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted">
          密钥完整内容仅在创建时显示一次；列表中可复制前缀便于识别。可用模型为「无限制」表示可调用平台全部分组。
        </p>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-sm">
          <button
            type="button"
            onClick={() => setDevGuideOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-accent/5"
          >
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 font-semibold">
                <Code2 className="h-5 w-5 shrink-0 text-accent" />
                开发者接入说明
              </h2>
              <p className="mt-1 text-xs text-muted">
                {devGuideOpen
                  ? `示例默认模型：${exampleModel}`
                  : "展开查看 base URL 与代码示例"}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted transition-transform",
                devGuideOpen && "rotate-180"
              )}
            />
          </button>
          {devGuideOpen && (
            <div className="border-t border-border px-6 pb-6 pt-4">
              <pre className="overflow-x-auto rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed text-slate-600">
                {`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${apiBaseUrl}",
  apiKey: "你的 API Key",
});

const res = await client.chat.completions.create({
  model: "${exampleModel}",
  messages: [{ role: "user", content: "你好" }],
});`}
              </pre>
            </div>
          )}
        </div>
      </div>

      <TokenFormDialog
        open={dialogOpen}
        mode={dialogMode}
        groups={groups}
        initial={formInitial}
        saving={saving}
        onClose={() => {
          setDialogOpen(false);
          setSaving(false);
        }}
        onSubmit={handleFormSubmit}
      />
    </DashboardShell>
  );
}
