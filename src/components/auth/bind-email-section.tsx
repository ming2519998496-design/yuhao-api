"use client";

import {
  errorBoxClass,
  inputClass,
  OtpField,
  successBoxClass,
} from "@/components/auth/otp-field";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { isOtpComplete, normalizeOtpInput } from "@/lib/otp";
import { createClient } from "@/lib/supabase";
import { Mail } from "lucide-react";
import { useMemo, useState } from "react";

type BindEmailSectionProps = {
  email: string | null | undefined;
  onBound: () => void;
};

/** 为仅手机号注册的账户补充绑定邮箱 */
export function BindEmailSection({ email, onBound }: BindEmailSectionProps) {
  const supabase = useMemo(() => createClient(), []);
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"idle" | "verify">("idle");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (email) return null;

  async function sendBindOtp(): Promise<boolean> {
    setErr("");
    setMsg("");
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setErr("请输入有效邮箱");
      return false;
    }

    const { error } = await supabase.auth.updateUser({ email: trimmed });
    if (error) {
      setErr(getAuthErrorMessage(error));
      return false;
    }

    setStep("verify");
    setMsg(`验证码已发送至 ${trimmed}`);
    return true;
  }

  async function confirmBind(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    const trimmed = newEmail.trim().toLowerCase();
    if (!isOtpComplete(otp)) {
      setErr("请输入完整的邮箱验证码");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: trimmed,
      token: otp,
      type: "email_change",
    });
    setLoading(false);

    if (error) {
      setErr(getAuthErrorMessage(error));
      return;
    }

    await fetch("/api/auth/sync-profile", { method: "POST" });
    setMsg("邮箱已绑定");
    setOtp("");
    setStep("idle");
    onBound();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold">
        <Mail className="h-5 w-5 text-accent" />
        绑定邮箱
      </h2>
      <p className="mt-1 text-xs text-muted">
        绑定后可使用邮箱与当前密码登录，并接收账单与通知邮件
      </p>

      {err && <div className={`${errorBoxClass} mt-3`}>{err}</div>}
      {msg && <div className={`${successBoxClass} mt-3`}>{msg}</div>}

      {step === "idle" ? (
        <div className="mt-4 space-y-3">
          <input
            type="email"
            className={inputClass}
            placeholder="邮箱地址"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button
            type="button"
            onClick={() => void sendBindOtp()}
            disabled={!newEmail}
            className="w-full rounded-lg bg-accent/10 py-2.5 text-sm font-semibold text-accent-dark hover:bg-accent/15 disabled:opacity-50"
          >
            获取验证码
          </button>
        </div>
      ) : (
        <form className="mt-4 space-y-3" onSubmit={confirmBind}>
          <p className="text-sm text-muted">发送至 {newEmail.trim().toLowerCase()}</p>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="邮箱验证码"
              value={otp}
              onChange={(e) => setOtp(normalizeOtpInput(e.target.value))}
            />
            <OtpField onSend={sendBindOtp} disabled={!newEmail} />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStep("idle");
                setOtp("");
                setErr("");
              }}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm text-muted hover:bg-accent/5"
            >
              重新填写
            </button>
            <button
              type="submit"
              disabled={loading || !isOtpComplete(otp)}
              className="flex-1 rounded-lg bg-accent/10 py-2.5 text-sm font-semibold text-accent-dark hover:bg-accent/15 disabled:opacity-50"
            >
              {loading ? "绑定中..." : "确认绑定"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
