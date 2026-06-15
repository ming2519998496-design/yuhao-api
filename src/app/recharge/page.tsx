"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PaymentQrImage } from "@/components/payment/payment-qr-image";
import { OnlineRechargePanel } from "@/components/recharge/online-recharge-panel";
import {
  computeOnlineCreditedBalance,
  MANUAL_RECHARGE_DELAY_NOTICE,
  MANUAL_RECHARGE_EXTRA_NOTICE,
  MANUAL_RECHARGE_MIN_PAY_YUAN,
  RECHARGE_MIN_YUAN,
} from "@/lib/recharge-fees";
import { cn } from "@/lib/utils";
import {
  getPaymentMethodLabel,
  PAYMENT_CHANNELS,
  type PaymentChannel,
  type PublicPaymentAccount,
} from "@/lib/payment-settings";
import {
  ChevronDown,
  Copy,
  History,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const RECORDS_PREVIEW = 5;

type PublicAccounts = {
  combined: PublicPaymentAccount;
  alipay: PublicPaymentAccount;
  wechat: PublicPaymentAccount;
};

type RechargeRecord = {
  id: number;
  orderNo: string;
  amount: number;
  paidAmount?: number | null;
  method: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  completedAt: string | null;
  source?: string;
  payRedirectUrl?: string | null;
  expiredAt?: string | null;
};

function formatRecordAmount(row: RechargeRecord): string {
  const isOnline = row.source === "online";
  if (row.status === "pending") {
    if (isOnline && row.amount > 0) {
      const credited = computeOnlineCreditedBalance(row.amount);
      return `待支付 ¥${row.amount.toFixed(2)}（预计到账 ¥${credited.toFixed(2)}）`;
    }
    return row.amount > 0 ? `¥${row.amount.toFixed(2)}` : "待核对";
  }
  if (isOnline && row.paidAmount != null && row.paidAmount > row.amount) {
    return `到账 ¥${row.amount.toFixed(2)}（实付 ¥${row.paidAmount.toFixed(2)}）`;
  }
  return row.amount > 0 ? `¥${row.amount.toFixed(2)}` : "待核对";
}

function formatRechargeTime(iso: string): string {
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

function rechargeSourceLabel(source?: string): string {
  return source === "online" ? "在线支付" : "人工转账";
}

export default function RechargePage() {
  const [method, setMethod] = useState<PaymentChannel>("combined");
  const [accounts, setAccounts] = useState<PublicAccounts | null>(null);
  const [balance, setBalance] = useState(0);
  const [records, setRecords] = useState<RechargeRecord[]>([]);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [recordsShowAll, setRecordsShowAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [lastOrderNo, setLastOrderNo] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState("");

  const canSubmit = proofFile !== null;

  async function loadRecords() {
    const res = await fetch("/api/recharge/records");
    const data = await res.json().catch(() => ({}));
    if (data.records) setRecords(data.records);
    return data.records as RechargeRecord[] | undefined;
  }

  async function loadBalance() {
    const res = await fetch("/api/dashboard/stats");
    const data = await res.json().catch(() => ({}));
    if (typeof data.balance === "number") setBalance(data.balance);
    return data.balance as number | undefined;
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/payment").then((r) => r.json()),
      loadBalance(),
      loadRecords(),
    ]).then(([payment]) => {
      if (payment.accounts) {
        setAccounts(payment.accounts);
        const enabled = PAYMENT_CHANNELS.filter(
          (id) => payment.accounts[id]?.enabled
        );
        if (enabled.length > 0) setMethod(enabled[0]);
      }
    });
  }, []);

  const recordsRef = useRef(records);
  recordsRef.current = records;

  const pendingRecords = records.filter((r) => r.status === "pending");
  const hasPendingRecords = pendingRecords.length > 0;
  const pendingManualRecord = pendingRecords.find(
    (r) => r.source !== "online"
  );
  const pendingOnlineRecord = pendingRecords.find(
    (r) => r.source === "online"
  );

  useEffect(() => {
    if (!hasPendingRecords) return;

    async function refreshPending() {
      const newRecords = await loadRecords();
      await loadBalance();
      if (!newRecords) return;

      const newlyCompleted = newRecords.filter(
        (r) =>
          r.status === "completed" &&
          recordsRef.current.find(
            (old) => old.id === r.id && old.status === "pending"
          )
      );

      if (newlyCompleted.length > 0) {
        const row = newlyCompleted[0];
        const via =
          row.source === "online" ? "在线充值" : "人工充值";
        const detail =
          row.source === "online" &&
          row.paidAmount != null &&
          row.paidAmount > row.amount
            ? `到账 ¥${row.amount.toFixed(2)}（实付 ¥${row.paidAmount.toFixed(2)}）`
            : `¥${row.amount.toFixed(2)}`;
        setSubmitMsg(`${via} ${detail} 已到账，余额已更新`);
      }
    }

    const timer = setInterval(() => void refreshPending(), 8000);
    window.addEventListener("focus", refreshPending);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshPending);
    };
  }, [hasPendingRecords]);

  async function handleSubmitRecharge(): Promise<boolean> {
    if (!proofFile) {
      setSubmitMsg("请上传转账成功截图，未转账无法提交");
      return false;
    }

    setSubmitMsg("");
    setSubmitting(true);
    const formData = new FormData();
    formData.append("amount", "0");
    formData.append("method", method);
    formData.append("proof", proofFile);

    const res = await fetch("/api/recharge/records", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setSubmitMsg(
        [data.error, data.hint].filter(Boolean).join("；") || "提交失败"
      );
      return false;
    }
    setSubmitMsg(data.message ?? "充值记录已提交，请等待管理员确认到账");
    if (data.record?.orderNo) {
      setLastOrderNo(data.record.orderNo);
    }
    await loadRecords();
    setRecordsOpen(true);
    setRecordsShowAll(false);
    return true;
  }

  function openManualModal() {
    if (!activeAccount?.enabled) return;
    if (pendingOnlineRecord) {
      setSubmitMsg("请先完成或等待在线支付订单过期，再提交人工转账");
      return;
    }
    setSubmitMsg("");
    setLastOrderNo("");
    setProofFile(null);
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofPreview("");
    setQrModalOpen(true);
  }

  function handleProofChange(file: File | null) {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofFile(file);
    setProofPreview(file ? URL.createObjectURL(file) : "");
  }

  async function handleConfirmTransfer() {
    if (!proofFile) {
      setSubmitMsg("请先上传转账成功截图");
      return;
    }
    await handleSubmitRecharge();
  }

  const visibleRecords = recordsShowAll
    ? records
    : records.slice(0, RECORDS_PREVIEW);
  const hasMoreRecords = records.length > RECORDS_PREVIEW;
  const latestRecord = records[0];

  const enabledMethods = PAYMENT_CHANNELS.filter(
    (id) => accounts?.[id]?.enabled
  );

  const activeAccount = accounts?.[method];

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    alert("已复制");
  }

  return (
    <DashboardShell
      title="我的钱包"
      description={`在线支付与人工转账均 ${RECHARGE_MIN_YUAN} 元起充，按量计费透明可查`}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/10 via-surface-elevated to-surface-elevated p-6 shadow-sm">
          <p className="text-sm text-muted">当前余额</p>
          <p className="mt-1 text-3xl font-bold text-foreground">
            ¥{balance.toFixed(2)}
          </p>
          <p className="mt-2 text-xs text-muted">
            请选择充值方式：在线支付（含 1.8% 手续费、即时到账）或人工转账（无手续费、需上传凭证）
          </p>
        </div>

        <OnlineRechargePanel
          hasPendingOrder={hasPendingRecords}
          pendingOnlineOrder={
            pendingOnlineRecord
              ? {
                  orderNo: pendingOnlineRecord.orderNo,
                  payRedirectUrl: pendingOnlineRecord.payRedirectUrl ?? null,
                  expiredAt: pendingOnlineRecord.expiredAt ?? null,
                  amount: pendingOnlineRecord.amount,
                  method: pendingOnlineRecord.method,
                }
              : null
          }
          onPaymentComplete={(message) => setSubmitMsg(message)}
          onRecordsChange={async () => {
            await loadRecords();
            await loadBalance();
          }}
        />

        <div className="relative flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="shrink-0 text-xs text-muted">或 · 选择人工充值</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <Upload className="h-5 w-5 text-muted" />
            人工转账
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
              无手续费
            </span>
          </h2>
          <p className="mt-2 text-sm text-muted">
            向平台收款码转账并上传充值凭证，<strong className="text-foreground">实际转账金额即为到账余额</strong>。
          </p>
          <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
            {MANUAL_RECHARGE_DELAY_NOTICE}
          </p>
          <p className="mt-2 text-xs text-muted">{MANUAL_RECHARGE_EXTRA_NOTICE}</p>

          {enabledMethods.length === 0 && (
            <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">
              管理员尚未配置收款账户，请稍后再试或{" "}
              <Link
                href="/dashboard/support"
                className="text-accent-dark hover:underline"
              >
                联系客服
              </Link>
            </p>
          )}

          {pendingOnlineRecord && (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
              您有一笔进行中的在线支付订单（{pendingOnlineRecord.orderNo}
              ），请先完成支付或等待过期后再提交人工转账。
            </p>
          )}

          {submitMsg && !qrModalOpen && (
            <p
              className={`mt-4 text-xs ${
                submitMsg.includes("失败") ||
                submitMsg.includes("错误") ||
                submitMsg.includes("请先")
                  ? "text-red-500"
                  : "text-emerald-600"
              }`}
            >
              {submitMsg}
            </p>
          )}

          <button
            type="button"
            disabled={
              submitting ||
              enabledMethods.length === 0 ||
              !activeAccount?.enabled ||
              Boolean(pendingOnlineRecord) ||
              Boolean(pendingManualRecord)
            }
            onClick={openManualModal}
            className="mt-4 w-full rounded-xl border border-border bg-background py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingManualRecord
              ? "人工订单待确认中…"
              : submitting
                ? "提交中..."
                : "充值并上传凭证"}
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-sm">
          <button
            type="button"
            onClick={() => setRecordsOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-accent/5"
          >
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 font-semibold">
                <History className="h-5 w-5 shrink-0 text-accent" />
                充值记录
                {records.length > 0 && (
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-dark">
                    {records.length}
                  </span>
                )}
              </h2>
              {!recordsOpen && latestRecord ? (
                <p className="mt-1 truncate text-xs text-muted">
                  最近：{formatRechargeTime(latestRecord.createdAt)} ·{" "}
                  {latestRecord.amount > 0
                    ? formatRecordAmount(latestRecord)
                    : "待核对"}{" "}
                  · {latestRecord.statusLabel}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted">
                  点击展开查看充值金额与提交时间
                </p>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted transition-transform",
                recordsOpen && "rotate-180"
              )}
            />
          </button>

          {recordsOpen && (
            <>
              <div className="overflow-x-auto border-t border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface/80 text-left text-xs text-muted">
                      <th className="px-6 py-3 font-medium">订单号</th>
                      <th className="px-6 py-3 font-medium">充值时间</th>
                      <th className="px-6 py-3 font-medium">充值金额</th>
                      <th className="px-6 py-3 font-medium">方式</th>
                      <th className="px-6 py-3 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-10 text-center text-sm text-muted"
                        >
                          暂无充值记录
                        </td>
                      </tr>
                    ) : (
                      visibleRecords.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-border/60 last:border-0 hover:bg-accent/5"
                        >
                          <td className="px-6 py-3.5 font-mono text-xs font-medium text-foreground">
                            {row.orderNo}
                          </td>
                          <td className="px-6 py-3.5 text-muted">
                            {formatRechargeTime(row.createdAt)}
                          </td>
                          <td className="px-6 py-3.5 text-sm font-semibold text-foreground">
                            {formatRecordAmount(row)}
                          </td>
                          <td className="px-6 py-3.5 text-xs">
                            <span className="block text-foreground">
                              {rechargeSourceLabel(row.source)}
                            </span>
                            <span className="text-muted">
                              {getPaymentMethodLabel(row.method)}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={
                                row.status === "completed"
                                  ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700"
                                  : row.status === "rejected"
                                    ? "rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-600"
                                    : row.status === "expired"
                                      ? "rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs text-zinc-600"
                                      : "rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-800"
                              }
                            >
                              {row.statusLabel}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {hasMoreRecords && (
                <div className="border-t border-border px-6 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => setRecordsShowAll((v) => !v)}
                    className="text-sm font-medium text-accent-dark hover:underline"
                  >
                    {recordsShowAll
                      ? "收起"
                      : `查看更多（还有 ${records.length - RECORDS_PREVIEW} 条）`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {qrModalOpen && activeAccount?.enabled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setQrModalOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recharge-manual-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setQrModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted transition-colors hover:bg-accent/10 hover:text-foreground"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>

            <h3
              id="recharge-manual-title"
              className="pr-8 text-lg font-semibold text-foreground"
            >
              第一步：向平台账户转账
            </h3>
            <p className="mt-1 text-xs text-muted">
              请扫描下方收款码完成转账，单笔不能低于 ¥{MANUAL_RECHARGE_MIN_PAY_YUAN}，金额以实际转账为准
            </p>

            {enabledMethods.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {enabledMethods.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMethod(id)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium",
                      method === id
                        ? "border-accent bg-accent/10 text-accent-dark"
                        : "border-border text-muted"
                    )}
                  >
                    {getPaymentMethodLabel(id)}
                  </button>
                ))}
              </div>
            )}

            {activeAccount.qrCodeUrl ? (
              <div className="mt-4 flex justify-center rounded-2xl border border-border bg-white p-4">
                <PaymentQrImage
                  primaryUrl={activeAccount.qrCodeUrl}
                  backupUrl={activeAccount.qrCodeBackupUrl}
                  alt="收款码"
                  width={320}
                  height={320}
                  className="h-auto w-full max-w-[320px] rounded-lg object-contain"
                />
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                暂未配置收款码，请联系客服
              </p>
            )}

            {(activeAccount.accountName || activeAccount.accountNo) && (
              <div className="mt-4 space-y-2 rounded-xl border border-border bg-background/60 p-3 text-sm">
                {activeAccount.accountName && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted">收款户名</span>
                    <span className="flex items-center gap-2 font-medium">
                      {activeAccount.accountName}
                      <button
                        type="button"
                        onClick={() => copyText(activeAccount.accountName!)}
                        className="text-muted hover:text-accent"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                )}
                {activeAccount.accountNo && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted">收款账号</span>
                    <span className="flex items-center gap-2 font-mono text-xs font-medium">
                      {activeAccount.accountNo}
                      <button
                        type="button"
                        onClick={() => copyText(activeAccount.accountNo!)}
                        className="text-muted hover:text-accent"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                )}
              </div>
            )}

            {!lastOrderNo && (
              <div className="mt-6 border-t border-border pt-5">
                <h4 className="text-sm font-semibold text-foreground">
                  第二步：上传转账凭证
                </h4>
                <p className="mt-1 text-xs text-muted">
                  请上传支付宝/微信「转账成功」页面截图，未转账请勿提交
                </p>
                <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background px-4 py-6 transition-colors hover:border-accent/50 hover:bg-accent/5">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) =>
                      handleProofChange(e.target.files?.[0] ?? null)
                    }
                  />
                  {proofPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={proofPreview}
                      alt="转账凭证预览"
                      className="max-h-40 rounded-lg object-contain"
                    />
                  ) : (
                    <span className="text-sm text-muted">点击上传转账截图</span>
                  )}
                </label>
                {proofFile && (
                  <p className="mt-2 text-center text-xs text-emerald-600">
                    已选择：{proofFile.name}
                  </p>
                )}
              </div>
            )}

            {lastOrderNo && (
              <p className="mt-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-center font-mono text-sm font-semibold text-accent-dark">
                订单号：{lastOrderNo}
              </p>
            )}

            {submitMsg && (
              <p
                className={`mt-4 text-xs ${
                  submitMsg.includes("失败") || submitMsg.includes("错误")
                    ? "text-red-500"
                    : "text-emerald-600"
                }`}
              >
                {submitMsg}
              </p>
            )}

            <button
              type="button"
              disabled={submitting || (!lastOrderNo && !canSubmit)}
              onClick={() => {
                if (lastOrderNo) {
                  setQrModalOpen(false);
                  return;
                }
                void handleConfirmTransfer();
              }}
              className="mt-5 w-full rounded-xl border border-border bg-background py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "提交中..." : lastOrderNo ? "关闭" : "提交订单"}
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
