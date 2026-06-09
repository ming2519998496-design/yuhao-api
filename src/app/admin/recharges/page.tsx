"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { getPaymentMethodLabel } from "@/lib/payment-settings";
import { useCallback, useEffect, useState } from "react";

type PendingRecord = {
  id: number;
  orderNo: string;
  amount: number;
  method: string;
  email: string;
  createdAt: string;
  proofUrl: string | null;
};

export default function AdminRechargesPage() {
  const [records, setRecords] = useState<PendingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<PendingRecord | null>(null);
  const [confirmAmount, setConfirmAmount] = useState("");
  const [confirmMsg, setConfirmMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/recharge/pending");
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.records) {
      setRecords(data.records);
      setLoadError("");
    } else {
      setRecords([]);
      setLoadError(data.error ?? "加载失败");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openConfirm(record: PendingRecord) {
    setConfirmTarget(record);
    setConfirmAmount(record.amount > 0 ? record.amount.toFixed(2) : "");
    setConfirmMsg("");
  }

  async function submitConfirm() {
    if (!confirmTarget) return;
    if (!confirmTarget.proofUrl) {
      setConfirmMsg("该订单无转账凭证，无法确认入账");
      return;
    }
    const amount = Number(confirmAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      setConfirmMsg("请输入有效的到账金额（≥ ¥1）");
      return;
    }

    setConfirmingId(confirmTarget.id);
    setConfirmMsg("");
    const res = await fetch("/api/admin/recharge/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId: confirmTarget.id, amount }),
    });
    const data = await res.json().catch(() => ({}));
    setConfirmingId(null);

    if (res.ok) {
      setConfirmTarget(null);
      await load();
      alert(data.message ?? "已确认到账");
    } else {
      setConfirmMsg(data.error ?? "确认失败");
    }
  }

  return (
    <AdminShell
      title="充值确认"
      description="须核对转账凭证与收款流水，两者一致后再确认入账"
    >
      <div className="space-y-4">
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
                  <th className="px-6 py-3 font-medium">订单号</th>
                  <th className="px-6 py-3 font-medium">用户</th>
                  <th className="px-6 py-3 font-medium">申报金额</th>
                  <th className="px-6 py-3 font-medium">凭证</th>
                  <th className="px-6 py-3 font-medium">方式</th>
                  <th className="px-6 py-3 font-medium">提交时间</th>
                  <th className="px-6 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-muted">
                      加载中...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-muted">
                      暂无待确认充值
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-6 py-3.5 font-mono text-xs font-medium">
                        {r.orderNo}
                      </td>
                      <td className="px-6 py-3.5">{r.email || "—"}</td>
                      <td className="px-6 py-3.5 font-semibold">
                        {r.amount > 0 ? `¥${r.amount.toFixed(2)}` : "待核对"}
                      </td>
                      <td className="px-6 py-3.5">
                        {r.proofUrl ? (
                          <a
                            href={r.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent-dark hover:underline"
                          >
                            查看截图
                          </a>
                        ) : (
                          <span className="text-xs text-red-500">无凭证</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {getPaymentMethodLabel(r.method)}
                      </td>
                      <td className="px-6 py-3.5 text-muted">
                        {new Date(r.createdAt).toLocaleString("zh-CN")}
                      </td>
                      <td className="px-6 py-3.5">
                        <button
                          type="button"
                          disabled={confirmingId === r.id || !r.proofUrl}
                          onClick={() => openConfirm(r)}
                          className="rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-dark hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {confirmingId === r.id ? "处理中..." : "核对确认"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface-elevated p-6 shadow-xl">
            <h3 className="text-lg font-semibold">核对转账凭证</h3>
            <p className="mt-1 text-sm text-muted">
              订单 {confirmTarget.orderNo} · {confirmTarget.email}
            </p>

            {confirmTarget.proofUrl ? (
              <div className="mt-4 rounded-xl border border-border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={confirmTarget.proofUrl}
                  alt="转账凭证"
                  className="mx-auto max-h-64 w-full object-contain"
                />
                <a
                  href={confirmTarget.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block text-center text-xs text-accent-dark hover:underline"
                >
                  新窗口查看原图
                </a>
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                该订单缺少转账凭证，无法确认
              </p>
            )}

            <p className="mt-4 text-xs text-muted">
              {confirmTarget.amount > 0
                ? `用户申报 ¥${confirmTarget.amount.toFixed(2)}，请对照`
                : "用户未填金额，请对照"}
              <strong className="text-foreground">截图</strong>与
              <strong className="text-foreground">收款流水</strong>
              填写实际到账金额
            </p>
            <div className="mt-3">
              <label className="mb-1 block text-xs text-muted">
                实际到账金额（元）
              </label>
              <input
                type="number"
                min={1}
                step={0.01}
                value={confirmAmount}
                onChange={(e) => setConfirmAmount(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            {confirmMsg && (
              <p className="mt-2 text-xs text-red-500">{confirmMsg}</p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={
                  confirmingId === confirmTarget.id || !confirmTarget.proofUrl
                }
                onClick={() => void submitConfirm()}
                className="flex-1 rounded-lg bg-gradient-to-r from-accent to-accent-dark py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {confirmingId === confirmTarget.id ? "处理中..." : "确认入账"}
              </button>
              <button
                type="button"
                disabled={confirmingId === confirmTarget.id}
                onClick={() => setConfirmTarget(null)}
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
