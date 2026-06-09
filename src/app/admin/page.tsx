"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { Activity, Coins, Key, Users } from "lucide-react";
import { useEffect, useState } from "react";

type Stats = {
  userCount: number;
  keyCount: number;
  todayRequests: number;
  todayTokens: number;
  todayCost: number;
  totalCost: number;
  totalBalance: number;
  trend: { date: string; tokens: number; cost: number }[];
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data?.trend) setStats(data as Stats);
      });
  }, []);

  const trend = stats?.trend ?? [];
  const maxTokens =
    trend.length > 0 ? Math.max(...trend.map((t) => t.tokens), 1) : 1;

  return (
    <AdminShell title="管理总览" description="全平台用户、调用与资金数据">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="注册用户"
            value={String(stats?.userCount ?? "—")}
            icon={Users}
          />
          <StatCard
            title="API 密钥"
            value={String(stats?.keyCount ?? "—")}
            icon={Key}
          />
          <StatCard
            title="今日调用"
            value={String(stats?.todayRequests ?? "—")}
            sub={`${((stats?.todayTokens ?? 0) / 1000).toFixed(1)}K Token`}
            icon={Activity}
          />
          <StatCard
            title="今日收入"
            value={`¥${(stats?.todayCost ?? 0).toFixed(2)}`}
            sub={`余额合计 ¥${(stats?.totalBalance ?? 0).toFixed(2)}`}
            icon={Coins}
          />
        </div>

        <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
          <h2 className="font-semibold">近 7 日 Token 消耗（千）</h2>
          <div className="mt-6 flex h-40 items-end gap-2">
            {trend.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full max-w-8 rounded-t bg-accent"
                  style={{ height: `${(d.tokens / maxTokens) * 100}%` }}
                />
                <span className="text-[10px] text-muted">
                  {d.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface-elevated p-5">
            <p className="text-sm text-muted">累计消费</p>
            <p className="mt-1 text-2xl font-bold">
              ¥{(stats?.totalCost ?? 0).toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-elevated p-5">
            <p className="text-sm text-muted">快捷入口</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a href="/admin/users" className="text-accent hover:underline">
                用户管理
              </a>
              <span className="text-muted">·</span>
              <a
                href="/admin/settings/payment"
                className="text-accent hover:underline"
              >
                设置收款账户
              </a>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
