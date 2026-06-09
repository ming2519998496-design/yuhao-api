"use client";

import { AuthCard } from "@/components/auth/auth-card";
import {
  errorBoxClass,
  inputClass,
  OtpField,
  successBoxClass,
} from "@/components/auth/otp-field";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { isOtpComplete, normalizeOtpInput } from "@/lib/otp";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"send" | "reset">("send");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendRecoveryOtp(): Promise<boolean> {
    setError("");
    if (!email) {
      setError("请输入注册邮箱");
      return false;
    }
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (otpError) {
      setError(getAuthErrorMessage(otpError));
      return false;
    }
    setStep("reset");
    setSuccess("验证码已发送，请查收邮件后设置新密码");
    return true;
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "recovery",
    });

    if (verifyError) {
      setError(getAuthErrorMessage(verifyError));
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("密码已重置，正在跳转登录…");
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <AuthCard
      title="找回密码"
      subtitle="通过注册邮箱验证码重置密码"
      footer={
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="text-accent-light hover:underline">
            返回登录
          </Link>
        </p>
      }
    >
      {error && <div className={errorBoxClass}>{error}</div>}
      {success && <div className={successBoxClass}>{success}</div>}

      {step === "send" ? (
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted">注册邮箱</label>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="button"
            onClick={() => void sendRecoveryOtp()}
            className="w-full rounded-lg bg-gradient-to-r from-accent to-accent-dark py-2.5 text-sm font-semibold text-white"
          >
            发送验证码
          </button>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleReset}>
          <p className="text-sm text-muted">验证码已发送至 {email}</p>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="6–8 位验证码"
              value={otp}
              onChange={(e) => setOtp(normalizeOtpInput(e.target.value))}
              required
            />
            <OtpField onSend={sendRecoveryOtp} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted">新密码</label>
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !isOtpComplete(otp)}
            className="w-full rounded-lg bg-gradient-to-r from-accent to-accent-dark py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "重置中..." : "确认重置密码"}
          </button>
          <button
            type="button"
            className="w-full text-sm text-muted hover:text-accent"
            onClick={() => {
              setStep("send");
              setOtp("");
            }}
          >
            返回修改邮箱
          </button>
        </form>
      )}
    </AuthCard>
  );
}
