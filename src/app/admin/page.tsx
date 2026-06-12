"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Activity,
  ArrowDownToLine,
  Coins,
  Key,
  SlidersHorizontal,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

type Stats = {
  userCount: number;
  keyCount: number;
  todayRequests: number;
  todayTokens: number;
  todayApiIncome: number;
  todayRecharge: number;
  todayAdminAdjustment: number;
  totalCost: number;
  totalBalance: number;
  trend: {
    date: string;
    tokens: number;
    apiIncome: number;
    recharge: number;
    adminAdjustment: number;
  }[];
};

function formatYuan(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}¥${value.toFixed(2)}`;
}

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
            title="用户余额合计"
            value={`¥${(stats?.totalBalance ?? 0).toFixed(2)}`}
            sub="全平台账户余额"
            icon={Wallet}
          />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium text-muted">今日资金</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="今日 API 收入"
              value={`¥${(stats?.todayApiIncome ?? 0).toFixed(2)}`}
              sub="用户调用模型扣费"
              icon={Coins}
            />
            <StatCard
              title="今日充值"
              value={`¥${(stats?.todayRecharge ?? 0).toFixed(2)}`}
              sub="已确认到账的充值"
              icon={ArrowDownToLine}
            />
            <StatCard
              title="管理员调整"
              value={formatYuan(stats?.todayAdminAdjustment ?? 0)}
              sub={
                (stats?.todayAdminAdjustment ?? 0) < 0
                  ? "今日净调低用户余额"
                  : (stats?.todayAdminAdjustment ?? 0) > 0
                    ? "今日净调高用户余额"
                    : "今日无手动调整"
              }
              icon={SlidersHorizontal}
            />
          </div>
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
            <p className="text-sm text-muted">近 7 日 API 消费</p>
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
                href="/admin/recharges"
                className="text-accent hover:underline"
              >
                充值确认
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
