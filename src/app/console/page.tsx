"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Copy, Key, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ApiKeyItem {
  id: string;
  key_prefix: string;
  name: string;
  balance: number;
  total_usage: number;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export default function ConsolePage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [keyName, setKeyName] = useState("");

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (data.keys) setKeys(data.keys);
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    setCreating(true);
    setNewKey("");
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: keyName || undefined }),
    });
    const data = await res.json();
    if (data.key) {
      setNewKey(data.key);
      setKeyName("");
      fetchKeys();
    } else {
      alert(data.error || "创建失败");
    }
    setCreating(false);
  }

  async function deleteKey(id: string) {
    if (!confirm("确定删除此 API Key？")) return;
    const res = await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) fetchKeys();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert("已复制");
  }

  return (
    <DashboardShell
      title="控制台"
      description="管理 API 密钥、查看接入配置与调用说明"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
          <h2 className="text-lg font-semibold">创建新密钥</h2>
          <p className="mt-1 text-sm text-muted">
            支持创建多个子 Key，便于分项目或防刷量管理
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="密钥名称（可选）"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              type="button"
              onClick={createKey}
              disabled={creating}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-dark px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {creating ? "创建中..." : "创建密钥"}
            </button>
          </div>

          {newKey && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-sm font-semibold text-emerald-700">
                密钥创建成功！请立即复制保存，之后不再显示。
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-background px-3 py-2 font-mono text-xs">
                  {newKey}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(newKey)}
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-foreground"
                >
                  <Copy className="h-4 w-4" />
                  复制
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">我的密钥</h2>
          {loading ? (
            <p className="text-sm text-muted">加载中...</p>
          ) : keys.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface-elevated p-8 text-center text-sm text-muted">
              还没有 API Key，点击上方按钮创建
            </div>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <Key className="h-4 w-4 shrink-0 text-accent" />
                    <span className="font-medium">{key.name}</span>
                    <code className="font-mono text-xs text-muted">
                      {key.key_prefix}
                    </code>
                    <span
                      className={
                        key.is_active ? "text-emerald-600" : "text-red-500"
                      }
                    >
                      {key.is_active ? "启用" : "禁用"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
                    <span>
                      余额：
                      <span className="font-medium text-foreground">
                        ¥{key.balance.toFixed(2)}
                      </span>
                    </span>
                    <span>
                      累计消费：¥{key.total_usage.toFixed(2)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteKey(key.id)}
                  className="self-start rounded-lg border border-border p-2 text-muted transition-colors hover:border-red-300 hover:text-red-500 sm:self-center"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
          <h2 className="text-lg font-semibold">快速接入</h2>
          <p className="mt-2 text-sm text-muted">
            OpenAI 原生接口，国内直连。将 base URL 指向遇好API 即可：
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed text-slate-600">
            {`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://yuhouapi.com/v1",
  apiKey: "你的 API Key",
});

const res = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "你好" }],
});`}
          </pre>
        </div>
      </div>
    </DashboardShell>
  );
}
