"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import type { Announcement } from "@/lib/announcements-settings";
import { Megaphone, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function emptyItem(): Announcement {
  return {
    id: `ann-${Date.now().toString(36)}`,
    title: "",
    content: "",
    publishedAt: new Date().toISOString(),
    pinned: false,
  };
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/announcements");
    const data = await res.json();
    if (res.ok) {
      setItems(data.items ?? []);
      setUpdatedAt(data.updatedAt ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateItem(index: number, patch: Partial<Announcement>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/announcements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error || "保存失败");
      return;
    }
    setItems(data.items ?? []);
    setUpdatedAt(data.updatedAt ?? null);
    setMessage(data.message ?? "保存成功");
  }

  return (
    <AdminShell
      title="公告通知"
      description="编辑后保存，用户控制台「公告通知」页立即更新"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <Megaphone className="h-5 w-5 text-accent" />
            公告列表
          </h2>
          <p className="mt-1 text-sm text-muted">
            置顶公告排在最前。用户仅能在登录后的控制台查看。
          </p>
          {updatedAt && (
            <p className="mt-2 text-xs text-muted">
              最近更新：{new Date(updatedAt).toLocaleString("zh-CN")}
            </p>
          )}

          {loading ? (
            <p className="mt-6 text-sm text-muted">加载中...</p>
          ) : (
            <div className="mt-6 space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-background/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={Boolean(item.pinned)}
                        onChange={(e) =>
                          updateItem(index, { pinned: e.target.checked })
                        }
                      />
                      置顶
                    </label>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      删除
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    <input
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
                      placeholder="标题"
                      value={item.title}
                      onChange={(e) =>
                        updateItem(index, { title: e.target.value })
                      }
                    />
                    <textarea
                      className="min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
                      placeholder="正文内容"
                      value={item.content}
                      onChange={(e) =>
                        updateItem(index, { content: e.target.value })
                      }
                    />
                    <div>
                      <label className="mb-1 block text-xs text-muted">
                        发布时间
                      </label>
                      <input
                        type="datetime-local"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
                        value={toLocalInput(item.publishedAt)}
                        onChange={(e) =>
                          updateItem(index, {
                            publishedAt: new Date(e.target.value).toISOString(),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setItems((prev) => [emptyItem(), ...prev])}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent-dark"
              >
                <Plus className="h-4 w-4" />
                新增公告
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void handleSave()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-dark px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "保存中..." : "保存公告"}
          </button>
        </div>

        {message && (
          <p
            className={`text-sm ${
              message.includes("失败") ? "text-red-500" : "text-emerald-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </AdminShell>
  );
}
