"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Activity,
  Coins,
  Cpu,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

type DashboardStats = {
  balance: number;
  totalUsage: number;
  todayRequests: number;
  todayTokens: number;
  todayCost: number;
  activeModels: number;
  trend: { day: string; tokens: number }[];
  modelUsage: { name: string; percent: number }[];
  recentRequests: {
    time: string;
    model: string;
    tokens: number;
    cost: string;
    status: string;
  }[];
};

const MODEL_COLORS = [
  "bg-accent",
  "bg-accent-light",
  "bg-accent-dark",
  "bg-slate-400",
  "bg-slate-300",
  "bg-slate-200",
];

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.todayRequests !== undefined) setStats(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const trend = stats?.trend ?? [];
  const maxTokens = Math.max(1, ...trend.map((d) => d.tokens));
  const modelUsage = stats?.modelUsage ?? [];
  const recentRequests = stats?.recentRequests ?? [];

  return (
    <DashboardShell
      title="数据看板"
      description="实时掌握 Token 消耗、费用与模型调用分布"
    >
      {loading ? (
        <p className="text-sm text-muted">加载中...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <StatCard
              title="账户余额"
              value={`¥${(stats?.balance ?? 0).toFixed(2)}`}
              sub="充值 − 消费"
              icon={Wallet}
            />
            <StatCard
              title="累计消费"
              value={`¥${(stats?.totalUsage ?? 0).toFixed(2)}`}
              sub="历史扣费合计"
              icon={Coins}
            />
            <StatCard
              title="今日调用"
              value={String(stats?.todayRequests ?? 0)}
              sub="次请求"
              icon={Activity}
            />
            <StatCard
              title="今日 Token"
              value={formatTokens(stats?.todayTokens ?? 0)}
              sub="输入 + 输出"
              icon={Zap}
            />
            <StatCard
              title="今日消费"
              value={`¥${(stats?.todayCost ?? 0).toFixed(2)}`}
              sub="按量计费"
              icon={TrendingUp}
            />
            <StatCard
              title="活跃模型"
              value={String(stats?.activeModels ?? 0)}
              sub="近 7 日使用"
              icon={Cpu}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm lg:col-span-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">近 7 日 Token 趋势</h2>
                  <p className="mt-1 text-xs text-muted">单位：Token</p>
                </div>
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div className="mt-8 flex items-end justify-between gap-2 sm:gap-4">
                {trend.map((item) => (
                  <div
                    key={item.day}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div className="flex h-36 w-full items-end justify-center">
                      <div
                        className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-accent-dark to-accent transition-all"
                        style={{
                          height: `${(item.tokens / maxTokens) * 100}%`,
                          minHeight: item.tokens > 0 ? "4px" : "0",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-muted sm:text-xs">
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm lg:col-span-2">
              <h2 className="font-semibold">模型用量分布</h2>
              <p className="mt-1 text-xs text-muted">按 Token 占比</p>
              {modelUsage.length === 0 ? (
                <p className="mt-8 text-center text-sm text-muted">
                  近 7 日暂无调用
                </p>
              ) : (
                <div className="mt-6 space-y-4">
                  {modelUsage.map((m, i) => (
                    <div key={m.name}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="truncate font-mono text-xs">
                          {m.name}
                        </span>
                        <span className="text-muted">{m.percent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface">
                        <div
                          className={`h-full rounded-full ${MODEL_COLORS[i % MODEL_COLORS.length]}`}
                          style={{ width: `${m.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-semibold">最近请求</h2>
              <p className="mt-1 text-xs text-muted">来自数据库实时统计</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/80 text-left text-xs text-muted">
                    <th className="px-6 py-3 font-medium">时间</th>
                    <th className="px-6 py-3 font-medium">模型</th>
                    <th className="px-6 py-3 font-medium">Token</th>
                    <th className="px-6 py-3 font-medium">费用</th>
                    <th className="px-6 py-3 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-muted"
                      >
                        暂无调用记录
                      </td>
                    </tr>
                  ) : (
                    recentRequests.map((row) => (
                      <tr
                        key={row.time + row.model + row.tokens}
                        className="border-b border-border/60 last:border-0 hover:bg-accent/5"
                      >
                        <td className="px-6 py-3.5 font-mono text-xs text-muted">
                          {row.time}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-xs">
                          {row.model}
                        </td>
                        <td className="px-6 py-3.5">
                          {row.tokens.toLocaleString()}
                        </td>
                        <td className="px-6 py-3.5">¥{row.cost}</td>
                        <td className="px-6 py-3.5">
                          <span
                            className={
                              row.status === "成功"
                                ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700"
                                : "rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-600"
                            }
                          >
                            {row.status}
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
      )}
    </DashboardShell>
  );
}
