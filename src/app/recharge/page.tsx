"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { cn } from "@/lib/utils";
import { Check, CreditCard, Wallet } from "lucide-react";
import { useState } from "react";

const PRESETS = [1, 10, 50, 100, 500, 1000];

const PAYMENT_METHODS = [
  { id: "alipay", label: "支付宝", desc: "推荐，即时到账" },
  { id: "wechat", label: "微信支付", desc: "扫码支付" },
  { id: "bank", label: "对公转账", desc: "企业用户专属" },
];

export default function RechargePage() {
  const [amount, setAmount] = useState(50);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState("alipay");
  const [agreed, setAgreed] = useState(true);

  const finalAmount = custom ? Number(custom) || 0 : amount;

  return (
    <DashboardShell
      title="账户充值"
      description="无门槛充值，1 元起充，按量计费透明可查"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/10 via-surface-elevated to-surface-elevated p-6 shadow-sm">
          <p className="text-sm text-muted">当前余额</p>
          <p className="mt-1 text-3xl font-bold text-foreground">¥128.50</p>
          <p className="mt-2 text-xs text-muted">
            充值后即时到账，余额永久有效
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <Wallet className="h-5 w-5 text-accent" />
            选择充值金额
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setAmount(v);
                  setCustom("");
                }}
                className={cn(
                  "rounded-xl border py-3 text-sm font-semibold transition-all",
                  amount === v && !custom
                    ? "border-accent bg-accent/10 text-accent-dark shadow-sm"
                    : "border-border bg-background hover:border-border-hover"
                )}
              >
                ¥{v}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-xs text-muted">
              自定义金额（最低 ¥1）
            </label>
            <input
              type="number"
              min={1}
              placeholder="输入金额"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <CreditCard className="h-5 w-5 text-accent" />
            支付方式
          </h2>
          <div className="mt-4 space-y-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                  method === m.id
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-border-hover"
                )}
              >
                <div>
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted">{m.desc}</p>
                </div>
                {method === m.id && (
                  <Check className="h-4 w-4 text-accent" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">充值金额</span>
            <span className="text-xl font-bold text-foreground">
              ¥{finalAmount.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>手续费</span>
            <span className="text-emerald-600">¥0.00</span>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded border-border accent-accent"
            />
            我已阅读并同意《充值服务协议》，了解余额不可提现规则
          </label>
          <button
            type="button"
            disabled={!agreed || finalAmount < 1}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-accent to-accent-dark py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            确认支付 ¥{finalAmount.toFixed(2)}
          </button>
          <p className="mt-3 text-center text-[11px] text-muted">
            演示环境，点击支付不会发起真实扣款
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
