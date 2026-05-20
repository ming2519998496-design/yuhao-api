"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Activity,
  Coins,
  Cpu,
  TrendingUp,
  Zap,
} from "lucide-react";

const usageByDay = [
  { day: "周一", tokens: 42 },
  { day: "周二", tokens: 58 },
  { day: "周三", tokens: 35 },
  { day: "周四", tokens: 71 },
  { day: "周五", tokens: 64 },
  { day: "周六", tokens: 28 },
  { day: "周日", tokens: 45 },
];

const modelUsage = [
  { name: "GPT-4o", percent: 38, color: "bg-accent" },
  { name: "Claude 3.5", percent: 28, color: "bg-accent-light" },
  { name: "DeepSeek", percent: 22, color: "bg-accent-dark" },
  { name: "其他", percent: 12, color: "bg-slate-300" },
];

const recentRequests = [
  {
    time: "14:32:08",
    model: "gpt-4o",
    tokens: 1240,
    cost: "0.018",
    status: "成功",
  },
  {
    time: "14:28:51",
    model: "claude-3-5-sonnet",
    tokens: 890,
    cost: "0.012",
    status: "成功",
  },
  {
    time: "14:15:22",
    model: "deepseek-chat",
    tokens: 2100,
    cost: "0.004",
    status: "成功",
  },
  {
    time: "13:58:04",
    model: "gpt-4o-mini",
    tokens: 450,
    cost: "0.001",
    status: "成功",
  },
];

export default function DashboardPage() {
  const maxTokens = Math.max(...usageByDay.map((d) => d.tokens));

  return (
    <DashboardShell
      title="数据看板"
      description="实时掌握 Token 消耗、费用与模型调用分布"
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="今日调用"
            value="1,284"
            sub="次请求"
            icon={Activity}
            trend={{ value: "12.5%", up: true }}
          />
          <StatCard
            title="今日 Token"
            value="328K"
            sub="输入 + 输出"
            icon={Zap}
            trend={{ value: "8.2%", up: true }}
          />
          <StatCard
            title="今日消费"
            value="¥12.46"
            sub="按量计费"
            icon={Coins}
            trend={{ value: "3.1%", up: false }}
          />
          <StatCard
            title="活跃模型"
            value="6"
            sub="近 7 日使用"
            icon={Cpu}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm lg:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">近 7 日 Token 趋势</h2>
                <p className="mt-1 text-xs text-muted">单位：千 Token</p>
              </div>
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div className="mt-8 flex items-end justify-between gap-2 sm:gap-4">
              {usageByDay.map((item) => (
                <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-36 w-full items-end justify-center">
                    <div
                      className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-accent-dark to-accent transition-all"
                      style={{
                        height: `${(item.tokens / maxTokens) * 100}%`,
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
            <div className="mt-6 space-y-4">
              {modelUsage.map((m) => (
                <div key={m.name}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>{m.name}</span>
                    <span className="text-muted">{m.percent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className={`h-full rounded-full ${m.color}`}
                      style={{ width: `${m.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-elevated shadow-sm overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-semibold">最近请求</h2>
            <p className="mt-1 text-xs text-muted">实时更新，费用透明可查</p>
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
                {recentRequests.map((row) => (
                  <tr
                    key={row.time + row.model}
                    className="border-b border-border/60 last:border-0 hover:bg-accent/5"
                  >
                    <td className="px-6 py-3.5 font-mono text-xs text-muted">
                      {row.time}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs">
                      {row.model}
                    </td>
                    <td className="px-6 py-3.5">{row.tokens.toLocaleString()}</td>
                    <td className="px-6 py-3.5">¥{row.cost}</td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
