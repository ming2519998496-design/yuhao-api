"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { QrCodeEditor } from "@/components/admin/qr-code-editor";
import { PaymentQrImage } from "@/components/payment/payment-qr-image";
import {
  DEFAULT_PAYMENT_ACCOUNTS,
  PAYMENT_CHANNEL_LABELS,
  PAYMENT_CHANNELS,
  resolveQrCodeUrl,
  type PaymentAccountItem,
  type PaymentAccountsConfig,
  type PaymentChannel,
} from "@/lib/payment-settings";
import { Check, Save, ShieldAlert, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const ADMIN_CHANNELS: {
  id: PaymentChannel;
  label: string;
  hint?: string;
}[] = [
  {
    id: "combined",
    label: "二码合一",
    hint: "一张收款码同时支持支付宝与微信扫码，推荐优先启用",
  },
  { id: "alipay", label: "支付宝" },
  { id: "wechat", label: "微信支付" },
];

type PendingInfo = {
  accounts: PaymentAccountsConfig;
  proposedByEmail: string;
  proposedAt: string;
  changedChannels: PaymentChannel[];
};

export default function AdminPaymentSettingsPage() {
  const [accounts, setAccounts] = useState<PaymentAccountsConfig>(
    DEFAULT_PAYMENT_ACCOUNTS
  );
  const [pending, setPending] = useState<PendingInfo | null>(null);
  const [canApprove, setCanApprove] = useState(false);
  const [isProposer, setIsProposer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    return fetch("/api/admin/settings/payment")
      .then((r) => r.json())
      .then((d) => {
        if (d.accounts) setAccounts(d.accounts);
        setPending(d.pending ?? null);
        setCanApprove(!!d.canApprove);
        setIsProposer(!!d.isProposer);
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateChannel(
    channel: PaymentChannel,
    patch: Partial<PaymentAccountItem>
  ) {
    setAccounts((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], ...patch },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/settings/payment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accounts }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      await load();
      if (data.status === "pending_approval") {
        setMessage(data.message ?? "已提交，等待另一名管理员确认");
      } else {
        setMessage(
          data.hint
            ? `保存成功。${data.hint}`
            : data.message ?? "保存成功，用户充值页将显示最新收款信息"
        );
      }
    } else {
      setMessage(data.error || "保存失败");
    }
  }

  async function handleApprove() {
    setActing(true);
    setMessage("");
    const res = await fetch("/api/admin/settings/payment/approve", {
      method: "POST",
    });
    const data = await res.json();
    setActing(false);
    if (res.ok) {
      await load();
      setMessage(data.message ?? "已确认并生效");
    } else {
      setMessage(data.error || "确认失败");
    }
  }

  async function handleReject() {
    setActing(true);
    setMessage("");
    const res = await fetch("/api/admin/settings/payment/reject", {
      method: "POST",
    });
    const data = await res.json();
    setActing(false);
    if (res.ok) {
      await load();
      setMessage(data.message ?? "已驳回");
    } else {
      setMessage(data.error || "操作失败");
    }
  }

  return (
    <AdminShell
      title="设置收款账户"
      description="配置用户充值时的收款账号，前台付款将转账至此处"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {pending && (
          <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-4 text-sm">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-violet-900">待确认的收款码变更</p>
                <p className="mt-1 text-violet-800/90">
                  提交人：{pending.proposedByEmail} ·{" "}
                  {new Date(pending.proposedAt).toLocaleString("zh-CN")}
                </p>
                <p className="mt-1 text-violet-800/90">
                  涉及：{" "}
                  {pending.changedChannels
                    .map((c) => PAYMENT_CHANNEL_LABELS[c])
                    .join("、") || "收款码"}
                </p>
                <p className="mt-2 text-xs text-violet-800/80">
                  用户充值页仍显示<strong>变更前</strong>的收款码，直到确认通过。
                </p>
                {canApprove && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => void handleApprove()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      确认生效
                    </button>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => void handleReject()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      驳回
                    </button>
                  </div>
                )}
                {isProposer && !canApprove && (
                  <p className="mt-3 text-xs font-medium text-violet-900">
                    您已提交变更，请等待另一名管理员登录并确认。
                  </p>
                )}
              </div>
            </div>
            {pending.accounts && canApprove && (
              <div className="mt-4 grid gap-3 border-t border-violet-200/60 pt-4 sm:grid-cols-2">
                {PAYMENT_CHANNELS.map((id) => {
                  const url = resolveQrCodeUrl(pending.accounts[id]);
                  if (!url) return null;
                  return (
                    <div key={id} className="rounded-lg bg-white/80 p-2">
                      <p className="mb-2 text-xs font-medium text-violet-900">
                        待生效 · {PAYMENT_CHANNEL_LABELS[id]}
                      </p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`${PAYMENT_CHANNEL_LABELS[id]}收款码预览`}
                        className="mx-auto max-h-36 w-auto rounded border border-border"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {ADMIN_CHANNELS.map(({ id, label, hint }) => (
          <div
            key={id}
            className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  {label}
                  {id === "combined" && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-dark">
                      推荐
                    </span>
                  )}
                </h2>
                {hint && (
                  <p className="mt-1 text-xs text-muted">{hint}</p>
                )}
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={accounts[id].enabled}
                  onChange={(e) =>
                    updateChannel(id, { enabled: e.target.checked })
                  }
                  className="accent-accent"
                />
                启用
              </label>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted">收款户名</label>
                <input
                  value={accounts[id].accountName}
                  onChange={(e) =>
                    updateChannel(id, { accountName: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder="企业或个人姓名"
                />
              </div>
              {id !== "combined" && (
                <div>
                  <label className="mb-1 block text-xs text-muted">
                    {id === "alipay" ? "支付宝账号" : "微信号 / 备注"}
                  </label>
                  <input
                    value={accounts[id].accountNo}
                    onChange={(e) =>
                      updateChannel(id, { accountNo: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
                    placeholder={
                      id === "alipay" ? "example@email.com" : "微信号"
                    }
                  />
                </div>
              )}

              <QrCodeEditor
                channel={id}
                item={accounts[id]}
                onChange={(patch) => updateChannel(id, patch)}
                uploadHint={
                  id === "combined"
                    ? "点击选择二码合一收款码（最大 2MB）"
                    : undefined
                }
              />

              <div>
                <label className="mb-1 block text-xs text-muted">
                  转账备注说明（仅管理端）
                </label>
                <input
                  value={accounts[id].note}
                  onChange={(e) => updateChannel(id, { note: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder={
                    id === "combined"
                      ? "例如：请备注注册邮箱"
                      : "内部备注"
                  }
                />
              </div>
            </div>
          </div>
        ))}

        {message && (
          <p className="text-center text-sm text-muted">{message}</p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || acting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-dark py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "保存中..." : "保存收款设置"}
        </button>
      </div>
    </AdminShell>
  );
}
