"use client";

import { useEffect, useState } from "react";

export function OtpField({
  onSend,
  sendLabel = "获取验证码",
  disabled,
}: {
  onSend: () => Promise<boolean>;
  sendLabel?: string;
  disabled?: boolean;
}) {
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function handleSend() {
    if (countdown > 0 || sending || disabled) return;
    setSending(true);
    const ok = await onSend();
    setSending(false);
    if (ok) setCountdown(60);
  }

  return (
    <button
      type="button"
      onClick={handleSend}
      disabled={disabled || countdown > 0 || sending}
      className="shrink-0 rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-accent-dark transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      {sending ? "发送中..." : countdown > 0 ? `${countdown}s` : sendLabel}
    </button>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent/50";

export const errorBoxClass =
  "mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400";

export const successBoxClass =
  "mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-600";
