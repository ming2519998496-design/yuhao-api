"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { getPaymentMethodLabel } from "@/lib/payment-settings";
import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type OrderRow = {
  id: number;
  orderNo: string;
  amount: number;
  method: string;
  status: string;
  statusLabel: string;
  email: string;
  fullName: string;
  createdAt: string;
  completedAt: string | null;
};

const STATUS_TABS = [
  { id: "all", label: "全部" },
  { id: "pending", label: "待到账" },
  { id: "completed", label: "已到账" },
  { id: "rejected", label: "已拒绝" },
] as const;

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]["id"]>("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/orders?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.orders) {
      setOrders(data.orders);
      setLoadError("");
    } else {
      setOrders([]);
      setLoadError(data.error ?? "加载失败");
    }
    setLoading(false);
  }, [status, q]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <AdminShell
      title="订单管理"
      description="查看全部充值订单，支持按订单号、用户搜索"
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatus(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  status === tab.id
                    ? "bg-accent text-white"
                    : "border border-border bg-background text-muted hover:border-accent/40"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索订单号 / 邮箱 / 姓名"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        </div>

        {loadError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {loadError}
          </p>
        )}

        <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/80 text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">订单号</th>
                  <th className="px-4 py-3 font-medium">下单时间</th>
                  <th className="px-4 py-3 font-medium">确认时间</th>
                  <th className="px-4 py-3 font-medium">用户</th>
                  <th className="px-4 py-3 font-medium">充值金额</th>
                  <th className="px-4 py-3 font-medium">支付方式</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted">
                      加载中...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted">
                      暂无订单
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-border/60 last:border-0 hover:bg-accent/5"
                    >
                      <td className="px-4 py-3.5 font-mono text-xs font-medium text-foreground">
                        {o.orderNo}
                      </td>
                      <td className="px-4 py-3.5 text-muted">
                        {formatTime(o.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-muted">
                        {formatTime(o.completedAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium">{o.email || "—"}</p>
                        {o.fullName && (
                          <p className="text-xs text-muted">{o.fullName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-semibold">
                        ¥{o.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5">
                        {getPaymentMethodLabel(o.method)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={
                            o.status === "completed"
                              ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700"
                              : o.status === "rejected"
                                ? "rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-600"
                                : "rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-800"
                          }
                        >
                          {o.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
