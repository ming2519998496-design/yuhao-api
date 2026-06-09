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
import { KeyRound } from "lucide-react";
import { useMemo, useState } from "react";

type ChangePasswordSectionProps = {
  email: string | undefined;
  /** 成功提示文案，默认「登录密码已修改成功」 */
  successMessage?: string;
};

export function ChangePasswordSection({
  email,
  successMessage = "登录密码已修改成功",
}: ChangePasswordSectionProps) {
  const supabase = useMemo(() => createClient(), []);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendEmailOtp(): Promise<boolean> {
    setErr("");
    setMsg("");
    if (!email) {
      setErr("请先绑定邮箱后再修改密码");
      return false;
    }
    const res = await fetch("/api/auth/password-otp/send", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      email?: string;
      message?: string;
      forwardedTo?: string;
    };
    if (!res.ok) {
      setErr(data.error ?? "发送验证码失败，请稍后重试");
      return false;
    }
    setMsg(
      data.message ??
        `验证码已发送至 ${data.email ?? email}，请查收邮件（含垃圾箱）`
    );
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!email) {
      setErr("请先绑定邮箱后再修改密码");
      return;
    }
    if (!isOtpComplete(otp)) {
      setErr("请输入完整的邮箱验证码");
      return;
    }
    if (password.length < 8) {
      setErr("新密码至少 8 位");
      return;
    }
    if (password !== confirmPassword) {
      setErr("两次输入的新密码不一致");
      return;
    }

    setLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "recovery",
    });

    if (verifyError) {
      setErr(getAuthErrorMessage(verifyError));
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setErr(getAuthErrorMessage(updateError));
      return;
    }

    setMsg(successMessage);
    setOtp("");
    setPassword("");
    setConfirmPassword("");
  }

  if (!email) {
    return (
      <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound className="h-5 w-5 text-accent" />
          修改登录密码
        </h2>
        <p className="mt-2 text-sm text-muted">
          当前账户未绑定邮箱，请先在下方完成邮箱绑定，或使用
          <a href="/forgot-password" className="mx-1 text-accent-dark hover:underline">
            找回密码
          </a>
          通过注册邮箱重置。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold">
        <KeyRound className="h-5 w-5 text-accent" />
        修改登录密码
      </h2>
      <p className="mt-1 text-xs text-muted">
        将向当前绑定邮箱 <strong>{email}</strong> 发送验证码，验证通过后方可设置新密码
      </p>
      {err && <div className={`${errorBoxClass} mt-3`}>{err}</div>}
      {msg && <div className={`${successBoxClass} mt-3`}>{msg}</div>}
      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="邮箱验证码"
            value={otp}
            onChange={(e) => setOtp(normalizeOtpInput(e.target.value))}
            autoComplete="one-time-code"
          />
          <OtpField onSend={sendEmailOtp} />
        </div>
        <input
          type="password"
          className={inputClass}
          placeholder="新密码（至少 8 位）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />
        <input
          type="password"
          className={inputClass}
          placeholder="确认新密码"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />
        <button
          type="submit"
          disabled={loading || !isOtpComplete(otp) || !password || !confirmPassword}
          className="w-full rounded-lg bg-accent/10 py-2.5 text-sm font-semibold text-accent-dark hover:bg-accent/15 disabled:opacity-50"
        >
          {loading ? "提交中..." : "确认修改密码"}
        </button>
      </form>
    </div>
  );
}
