"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { Ban, Pencil, Search, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
  keyCount: number;
  balance: number;
  totalUsage: number;
  requestCount: number;
  totalTokens: number;
  isFrozen: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editBalance, setEditBalance] = useState("");
  const [saving, setSaving] = useState(false);
  const [freezingId, setFreezingId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  function loadUsers() {
    setLoading(true);
    fetch(`/api/admin/users?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timer = setTimeout(loadUsers, 300);
    return () => clearTimeout(timer);
  }, [q]);

  function openEdit(user: UserRow) {
    setEditing(user);
    setEditBalance(user.balance.toFixed(2));
    setMsg("");
  }

  async function saveBalance() {
    if (!editing) return;
    const balance = Number(editBalance);
    if (!Number.isFinite(balance) || balance < 0) {
      setMsg("请输入有效余额（≥ 0）");
      return;
    }

    setSaving(true);
    setMsg("");
    const res = await fetch("/api/admin/users/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: editing.id, balance }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setMsg(data.error ?? "保存失败");
      return;
    }

    setEditing(null);
    loadUsers();
  }

  async function toggleFreeze(user: UserRow) {
    const nextFrozen = !user.isFrozen;
    const label = nextFrozen ? "冻结" : "解冻";
    const confirmed = window.confirm(
      nextFrozen
        ? `确定冻结 ${user.email}？冻结后该用户将无法登录和使用 API。`
        : `确定解冻 ${user.email}？`
    );
    if (!confirmed) return;

    setFreezingId(user.id);
    setMsg("");
    const res = await fetch("/api/admin/users/freeze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, frozen: nextFrozen }),
    });
    const data = await res.json().catch(() => ({}));
    setFreezingId(null);

    if (!res.ok) {
      setMsg(data.error ?? `${label}失败`);
      return;
    }

    loadUsers();
  }

  return (
    <AdminShell title="用户管理" description="查看用户消费情况，调整余额，冻结违规账号">
      <div className="space-y-4">
        {msg && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600">
            {msg}
          </div>
        )}

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索邮箱或姓名"
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/80 text-left text-xs text-muted">
                  <th className="px-4 py-3">用户</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">角色</th>
                  <th className="px-4 py-3">密钥数</th>
                  <th className="px-4 py-3">余额</th>
                  <th className="px-4 py-3">累计消费</th>
                  <th className="px-4 py-3">调用次数</th>
                  <th className="px-4 py-3">注册时间</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted">
                      加载中...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted">
                      暂无用户
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-border/60 hover:bg-accent/5"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{u.email}</p>
                        <p className="text-xs text-muted">{u.fullName || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        {u.isFrozen ? (
                          <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs text-red-600">
                            已冻结
                          </span>
                        ) : (
                          <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-700">
                            正常
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            u.role === "admin"
                              ? "rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700"
                              : "text-muted"
                          }
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">{u.keyCount}</td>
                      <td className="px-4 py-3 font-semibold">
                        ¥{u.balance.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">¥{u.totalUsage.toFixed(2)}</td>
                      <td className="px-4 py-3">{u.requestCount}</td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:border-accent hover:text-accent-dark"
                          >
                            <Pencil className="h-3 w-3" />
                            调整余额
                          </button>
                          {u.role !== "admin" && (
                            <button
                              type="button"
                              disabled={freezingId === u.id}
                              onClick={() => void toggleFreeze(u)}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs disabled:opacity-50 ${
                                u.isFrozen
                                  ? "border-green-500/40 text-green-700 hover:bg-green-500/10"
                                  : "border-red-500/40 text-red-600 hover:bg-red-500/10"
                              }`}
                            >
                              {u.isFrozen ? (
                                <>
                                  <ShieldCheck className="h-3 w-3" />
                                  {freezingId === u.id ? "处理中..." : "解冻"}
                                </>
                              ) : (
                                <>
                                  <Ban className="h-3 w-3" />
                                  {freezingId === u.id ? "处理中..." : "冻结"}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-6 shadow-xl">
            <h3 className="text-lg font-semibold">调整余额</h3>
            <p className="mt-1 text-sm text-muted">{editing.email}</p>
            <p className="mt-1 text-xs text-muted">
              当前余额 ¥{editing.balance.toFixed(2)}
            </p>
            <div className="mt-4">
              <label className="mb-1 block text-xs text-muted">
                设置为（元）
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={editBalance}
                onChange={(e) => setEditBalance(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            {msg && <p className="mt-2 text-xs text-red-500">{msg}</p>}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveBalance()}
                className="flex-1 rounded-lg bg-gradient-to-r from-accent to-accent-dark py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditing(null)}
                className="flex-1 rounded-lg border border-border py-2 text-sm text-muted hover:bg-accent/5"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
