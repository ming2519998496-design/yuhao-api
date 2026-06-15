"use client";

import { PaymentPayQr } from "@/components/payment/payment-pay-qr";
import {
  computeOnlineCreditedBalance,
  getOnlineMinPayYuan,
  ONLINE_RECHARGE_FEE_NOTICE,
  ONLINE_RECHARGE_FEE_PERCENT_LABEL,
  ONLINE_RECHARGE_MIN_PAY_YUAN,
} from "@/lib/recharge-fees";
import { cn } from "@/lib/utils";
import { Clock, Loader2, Smartphone, X, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PRESET_AMOUNTS = [5, 10, 50, 100, 500];
const MAX_AMOUNT = 100_000;

type OnlineConfig = {
  enabled: boolean;
  reason?: string;
  provider?: string;
  merchantProfileLabel?: string;
  feePercentLabel?: string;
  feeDisclosure?: string;
  feeExample?: string;
  feeNotice?: string;
  minPayYuan?: number;
};

type Props = {
  hasPendingOrder: boolean;
  pendingOnlineOrder?: {
    orderNo: string;
    payRedirectUrl: string | null;
    expiredAt: string | null;
    amount: number;
    method: string;
  } | null;
  onPaymentComplete: (message: string) => void;
  onRecordsChange: () => Promise<void>;
};

function formatCountdown(expiredAt: string | null): string | null {
  if (!expiredAt) return null;
  const ms = new Date(expiredAt).getTime() - Date.now();
  if (ms <= 0) return "已过期";
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export function OnlineRechargePanel({
  hasPendingOrder,
  pendingOnlineOrder,
  onPaymentComplete,
  onRecordsChange,
}: Props) {
  const [config, setConfig] = useState<OnlineConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [amount, setAmount] = useState(50);
  const [method, setMethod] = useState<"wechat" | "alipay">("wechat");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [orderNo, setOrderNo] = useState("");
  const [payUrl, setPayUrl] = useState("");
  const [expiredAt, setExpiredAt] = useState<string | null>(null);
  const [payStatus, setPayStatus] = useState<
    "idle" | "pending" | "completed" | "expired"
  >("idle");
  const [countdown, setCountdown] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const creditedPreview = useMemo(
    () => computeOnlineCreditedBalance(amount),
    [amount]
  );
  const minPayYuan = config?.minPayYuan ?? getOnlineMinPayYuan();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollOrderStatus = useCallback(
    async (targetOrderNo: string, paidYuan: number) => {
      const res = await fetch(
        `/api/recharge/online/status?orderNo=${encodeURIComponent(targetOrderNo)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.record) return;

      const status = data.record.status as string;
      if (status === "completed") {
        stopPolling();
        setPayStatus("completed");
        setPayModalOpen(false);
        await onRecordsChange();
        const credited = Number(data.record.amount);
        onPaymentComplete(
          `在线充值已到账 ¥${credited.toFixed(2)}（实付 ¥${paidYuan.toFixed(2)}）`
        );
        setOrderNo("");
        setPayUrl("");
        setExpiredAt(null);
        setPayStatus("idle");
        return;
      }
      if (status === "expired") {
        stopPolling();
        setPayStatus("expired");
        setMsg("订单已过期，请重新发起支付");
      }
    },
    [onPaymentComplete, onRecordsChange, stopPolling]
  );

  const startPolling = useCallback(
    (targetOrderNo: string, paidYuan: number) => {
      stopPolling();
      void pollOrderStatus(targetOrderNo, paidYuan);
      pollRef.current = setInterval(() => {
        void pollOrderStatus(targetOrderNo, paidYuan);
      }, 2500);
    },
    [pollOrderStatus, stopPolling]
  );

  useEffect(() => {
    fetch("/api/recharge/online/config")
      .then((r) => r.json())
      .then((data: OnlineConfig) => setConfig(data))
      .finally(() => setConfigLoading(false));
  }, []);

  useEffect(() => {
    if (
      pendingOnlineOrder?.orderNo &&
      pendingOnlineOrder.payRedirectUrl &&
      !orderNo
    ) {
      setOrderNo(pendingOnlineOrder.orderNo);
      setPayUrl(pendingOnlineOrder.payRedirectUrl);
      setExpiredAt(pendingOnlineOrder.expiredAt);
      setAmount(pendingOnlineOrder.amount);
      setMethod(
        pendingOnlineOrder.method === "alipay" ? "alipay" : "wechat"
      );
      setPayStatus("pending");
      setPayModalOpen(true);
      startPolling(pendingOnlineOrder.orderNo, pendingOnlineOrder.amount);
    }
  }, [pendingOnlineOrder, orderNo, startPolling]);

  useEffect(() => {
    if (!expiredAt || payStatus !== "pending") {
      setCountdown(null);
      return;
    }
    const tick = () => setCountdown(formatCountdown(expiredAt));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiredAt, payStatus]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  async function handleCreatePayment() {
    if (hasPendingOrder && !pendingOnlineOrder?.orderNo) {
      setMsg("您已有待处理的充值订单，请等待处理完成后再试");
      return;
    }

    const value = Number(amount);
    if (!Number.isFinite(value) || value > MAX_AMOUNT) {
      setMsg(`充值金额不能超过 ¥${MAX_AMOUNT}`);
      return;
    }
    if (value < minPayYuan) {
      setMsg(`在线支付最低 ¥${ONLINE_RECHARGE_MIN_PAY_YUAN}`);
      return;
    }

    setMsg("");
    setSubmitting(true);
    const res = await fetch("/api/recharge/online/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: value, method }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setMsg(
        [data.error, data.hint].filter(Boolean).join("；") ||
          "在线支付暂不可用，请使用下方人工转账"
      );
      return;
    }

    setOrderNo(data.orderNo);
    setPayUrl(data.payRedirectUrl);
    setExpiredAt(data.expiredAt ?? null);
    setPayStatus("pending");
    setPayModalOpen(true);
    await onRecordsChange();
    startPolling(data.orderNo, value);
  }

  const onlineEnabled = config?.enabled === true;
  const blockedByOtherPending =
    hasPendingOrder && !pendingOnlineOrder?.orderNo;

  return (
    <>
      <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 via-surface-elevated to-surface-elevated p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Zap className="h-5 w-5 text-accent" />
            在线支付（回调入账）
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-dark">
              即时到账
            </span>
          </h2>
          {onlineEnabled && config?.merchantProfileLabel && (
            <span className="shrink-0 text-xs text-muted">
              {config.merchantProfileLabel}商户
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-muted">
          微信/支付宝扫码，付款成功后<strong className="text-foreground">自动入账</strong>，无需上传凭证。
        </p>
        <p className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
          {config?.feeNotice ?? ONLINE_RECHARGE_FEE_NOTICE}
          {onlineEnabled ? ` 最低支付 ¥${ONLINE_RECHARGE_MIN_PAY_YUAN}。` : ""}
        </p>

        {configLoading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            检测支付通道…
          </p>
        ) : !onlineEnabled ? (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
            在线支付暂不可用（{config?.reason ?? "未配置"}），请使用下方{" "}
            <strong>人工转账</strong> 方式充值。
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                    amount === preset
                      ? "border-accent bg-accent/10 text-accent-dark"
                      : "border-border text-muted hover:border-accent/40"
                  )}
                >
                  ¥{preset}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-sm">
              <span className="text-muted">支付金额（元）</span>
              <input
                type="number"
                min={minPayYuan}
                max={MAX_AMOUNT}
                step={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-accent"
              />
            </label>

            {Number.isFinite(amount) && amount >= minPayYuan && (
              <p className="mt-2 text-xs text-muted">
                预计余额到账{" "}
                <strong className="text-foreground">
                  ¥{creditedPreview.toFixed(2)}
                </strong>
                （已扣除 {config?.feePercentLabel ?? ONLINE_RECHARGE_FEE_PERCENT_LABEL} 手续费）
              </p>
            )}

            <div className="mt-4 flex gap-2">
              {(
                [
                  { id: "wechat" as const, label: "微信支付" },
                  { id: "alipay" as const, label: "支付宝" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMethod(item.id)}
                  className={cn(
                    "flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors",
                    method === item.id
                      ? "border-accent bg-accent/10 text-accent-dark"
                      : "border-border text-muted hover:border-accent/40"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {blockedByOtherPending && (
              <p className="mt-3 text-xs text-amber-800">
                您有一笔待处理的人工充值订单，请等待管理员确认后再发起在线支付。
              </p>
            )}

            {msg && (
              <p
                className={cn(
                  "mt-3 text-xs",
                  msg.includes("不可用") || msg.includes("失败") || msg.includes("过期")
                    ? "text-red-500"
                    : "text-emerald-600"
                )}
              >
                {msg}
              </p>
            )}

            <button
              type="button"
              disabled={
                submitting ||
                blockedByOtherPending ||
                payStatus === "pending"
              }
              onClick={() => void handleCreatePayment()}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent to-accent-dark py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "创建订单中…"
                : payStatus === "pending"
                  ? "等待支付中…"
                  : `立即支付 ¥${Number(amount).toFixed(2)}`}
            </button>

            {payStatus === "pending" && orderNo && !payModalOpen && (
              <button
                type="button"
                onClick={() => setPayModalOpen(true)}
                className="mt-2 w-full text-sm text-accent-dark hover:underline"
              >
                查看支付二维码（订单 {orderNo}）
              </button>
            )}
          </>
        )}
      </div>

      {payModalOpen && payUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setPayModalOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setPayModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted hover:bg-accent/10"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="flex items-center gap-2 pr-8 text-lg font-semibold">
              <Smartphone className="h-5 w-5 text-accent" />
              扫码完成支付
            </h3>
            <p className="mt-1 text-xs text-muted">
              请使用{method === "wechat" ? "微信" : "支付宝"}扫描下方二维码，支付 ¥
              {Number(amount).toFixed(2)}，预计到账 ¥
              {creditedPreview.toFixed(2)}
            </p>

            <div className="mt-4 flex justify-center rounded-2xl border border-border bg-white p-4">
              <PaymentPayQr
                payUrl={payUrl}
                alt="支付二维码"
                size={280}
                className="h-auto w-full max-w-[280px] rounded-lg"
              />
            </div>

            {countdown && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
                <Clock className="h-3.5 w-3.5" />
                订单有效期 {countdown}
              </p>
            )}

            <p className="mt-2 text-center font-mono text-xs text-muted">
              订单号：{orderNo}
            </p>

            <p className="mt-4 text-center text-xs text-muted">
              支付成功后余额将自动更新，请稍候…
            </p>

            <button
              type="button"
              onClick={() => setPayModalOpen(false)}
              className="mt-4 w-full rounded-xl border border-border py-2.5 text-sm text-muted hover:bg-accent/5"
            >
              收起二维码（可稍后继续支付）
            </button>
          </div>
        </div>
      )}
    </>
  );
}
