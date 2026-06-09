"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useEffect, useState } from "react";

type LogRow = {
  id: number;
  userEmail: string;
  model: string;
  total_tokens: number;
  cost: number;
  success: boolean;
  created_at: string;
};

export default function AdminUsagePage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/usage?limit=100")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell title="调用记录" description="全平台 API 调用明细">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/80 text-left text-xs text-muted">
                <th className="px-4 py-3">时间</th>
                <th className="px-4 py-3">用户</th>
                <th className="px-4 py-3">模型</th>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">费用</th>
                <th className="px-4 py-3">状态</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    加载中...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    暂无记录
                  </td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/60 hover:bg-accent/5"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {new Date(row.created_at).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-4 py-3">{row.userEmail}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.model}</td>
                    <td className="px-4 py-3">{row.total_tokens}</td>
                    <td className="px-4 py-3">¥{Number(row.cost).toFixed(4)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.success
                            ? "text-emerald-600"
                            : "text-red-500"
                        }
                      >
                        {row.success ? "成功" : "失败"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
