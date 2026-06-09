"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  REFERRAL_PROGRAM_HEADLINE,
  REFERRAL_PROGRAM_INVITE_LINE,
  REFERRAL_PROGRAM_NOTES,
} from "@/lib/referral-program";
import {
  Copy,
  Gift,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ReferralData = {
  affCode: string;
  inviteLink: string;
  inviteCount: number;
  pendingAmount: number;
  totalEarned: number;
  rewardRatePercent: number;
  firstRechargeMinYuan: number;
  newUserBonusYuan: number;
  schemaReady?: boolean;
};

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/referral");
    const json = await res.json().catch(() => ({}));
    if (res.ok) setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCopy() {
    if (!data?.inviteLink) return;
    await navigator.clipboard.writeText(data.inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleTransfer() {
    setMsg("");
    setTransferring(true);
    const res = await fetch("/api/referral/transfer", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setTransferring(false);
    if (!res.ok) {
      setMsg(json.error ?? "划转失败");
      return;
    }
    setMsg(json.message ?? "划转成功");
    await load();
  }

  const rewardPercent = data?.rewardRatePercent ?? 5;

  return (
    <DashboardShell
      title="邀请奖励"
      description="首充有礼，邀请好友各得 5% 奖励"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
            <Gift className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">邀请奖励</h2>
            <p className="text-sm text-muted">
              好友首充满 ¥{data?.firstRechargeMinYuan ?? 50}，您与好友各得{" "}
              {rewardPercent}% 奖励
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-accent/25 bg-accent/5 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">活动规则</h3>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            {REFERRAL_PROGRAM_HEADLINE}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {REFERRAL_PROGRAM_INVITE_LINE}
          </p>
          <p className="mt-4 text-xs font-medium text-muted">说明：</p>
          <ul className="mt-2 space-y-1.5">
            {REFERRAL_PROGRAM_NOTES.map((note) => (
              <li key={note} className="text-xs leading-relaxed text-muted">
                · {note}
              </li>
            ))}
          </ul>
        </div>

        {loading ? (
          <p className="text-sm text-muted">加载中...</p>
        ) : (
          <>
            {data?.schemaReady === false && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
                邀请功能数据库尚未初始化。请在 Supabase SQL Editor 里点 + →
                Create a new snippet，Run{" "}
                <code className="rounded bg-background px-1">
                  supabase-referral-schema.sql
                </code>
                （步骤见 docs/supabase-sql-editor-only.md）后刷新。
              </div>
            )}
            <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted">待使用收益</p>
                  <p className="mt-1 text-3xl font-bold text-red-600">
                    ¥{(data?.pendingAmount ?? 0).toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={
                    transferring || (data?.pendingAmount ?? 0) <= 0
                  }
                  onClick={() => void handleTransfer()}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent-dark disabled:opacity-50"
                >
                  {transferring ? "划转中..." : "划转到余额"}
                </button>
              </div>
              {msg && (
                <p
                  className={`mt-3 text-xs ${
                    msg.includes("失败") || msg.includes("无可")
                      ? "text-red-500"
                      : "text-red-600"
                  }`}
                >
                  {msg}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm">
                <p className="text-sm text-muted">总收益</p>
                <p className="mt-2 text-2xl font-bold">
                  ¥{(data?.totalEarned ?? 0).toFixed(2)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm">
                <p className="text-sm text-muted">邀请人数</p>
                <p className="mt-2 flex items-center gap-2 text-2xl font-bold">
                  <UserPlus className="h-5 w-5 text-muted" />
                  {data?.inviteCount ?? 0}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
              <h3 className="font-semibold">邀请链接</h3>
              <p className="mt-1 text-xs text-muted">
                好友通过此链接注册后，将与您的账户绑定
              </p>
              <div className="mt-4 flex gap-2">
                <input
                  readOnly
                  value={data?.inviteLink ?? ""}
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent-dark hover:bg-accent/15"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "已复制" : "复制"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Wallet className="h-4 w-4 text-accent" />
                如何获得奖励
              </h3>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
                <li>
                  · 复制邀请链接，好友注册并完成首充（单笔到账 ≥
                  ¥{data?.firstRechargeMinYuan ?? 50}）
                </li>
                <li>
                  · 您与好友各得首充金额 {rewardPercent}% 的奖励（每账号限一次）
                </li>
                <li>
                  · 好友作为新用户还可获赠 ¥{data?.newUserBonusYuan ?? 5}{" "}
                  余额（首充满 ¥{data?.firstRechargeMinYuan ?? 50}）
                </li>
                <li>· 通过「划转到余额」将待使用收益转入账户，用于 API 调用</li>
                <li>· 续充不再发放邀请奖励</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
