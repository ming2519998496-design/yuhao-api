"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Key, LogOut, Plus, Copy, Trash2, Sparkles, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

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

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [keyName, setKeyName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setUser(data.user);
        fetchKeys();
      }
    });
  }, []);

  async function fetchKeys() {
    const res = await fetch("/api/keys");
    const data = await res.json();
    if (data.keys) setKeys(data.keys);
    setLoading(false);
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert("已复制");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-dark">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="text-lg font-semibold">遇好API</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-red-500/30 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            退出
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">API Key 管理</h1>
            <p className="mt-1 text-sm text-muted">
              创建和管理您的 API 密钥
            </p>
          </div>
        </div>

        {/* 创建新 Key */}
        <div className="mt-8 rounded-xl border border-border bg-surface-elevated/50 p-6">
          <h2 className="text-lg font-semibold">创建新密钥</h2>
          <div className="mt-4 flex gap-3">
            <input
              type="text"
              placeholder="密钥名称（可选）"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              onClick={createKey}
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-dark px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {creating ? "创建中..." : "创建"}
            </button>
          </div>

          {/* 新创建的 Key 展示 */}
          {newKey && (
            <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
              <p className="text-sm font-semibold text-green-400">
                密钥创建成功！请立即复制保存，之后不再显示。
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-black/20 px-3 py-2 text-sm font-mono">
                  {newKey}
                </code>
                <button
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

        {/* Key 列表 */}
        <div className="mt-6 space-y-3">
          {keys.length === 0 ? (
            <div className="rounded-xl border border-border p-8 text-center text-sm text-muted">
              还没有 API Key，点击上方按钮创建
            </div>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated/30 p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-accent-light shrink-0" />
                    <span className="font-medium truncate">{key.name}</span>
                    <code className="text-xs text-muted font-mono">
                      {key.key_prefix}
                    </code>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted">
                    <span>
                      余额：<span className="text-foreground font-medium">{key.balance.toFixed(2)}</span> 元
                    </span>
                    <span>
                      累计消费：<span className="text-foreground">{key.total_usage.toFixed(2)}</span> 元
                    </span>
                    <span className={key.is_active ? "text-green-400" : "text-red-400"}>
                      {key.is_active ? "启用" : "禁用"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteKey(key.id)}
                  className="ml-4 rounded-lg border border-border p-2 text-muted transition-colors hover:border-red-500/30 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* 使用说明 */}
        <div className="mt-10 rounded-xl border border-border bg-surface-elevated/30 p-6">
          <h2 className="text-lg font-semibold">如何使用</h2>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p>在代码中将 OpenAI SDK 的 base URL 指向遇好API：</p>
            <pre className="rounded-lg bg-black/20 p-4 text-xs font-mono text-foreground">
{`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://yuhouapi.com/v1",
  apiKey: "你的 API Key",
});

const res = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "你好" }],
});
`}            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}
