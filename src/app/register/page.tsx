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
import {
  clearStoredAffCode,
  getStoredAffCode,
  storeAffCode,
  syncProfileClient,
} from "@/lib/sync-profile-client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const aff = new URLSearchParams(window.location.search).get("aff");
    if (aff) storeAffCode(aff);
  }, []);

  async function finishRegistration() {
    await syncProfileClient(getStoredAffCode());
    clearStoredAffCode();
    router.push("/dashboard");
    router.refresh();
  }

  async function requestSignupOtp(): Promise<{
    ok: boolean;
    message?: string;
  }> {
    const res = await fetch("/api/auth/register/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: data.error ?? "发送验证码失败" };
    }
    return { ok: true, message: data.message as string | undefined };
  }

  async function handleEmailRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const result = await requestSignupOtp();

    setLoading(false);
    if (!result.ok) {
      setError(result.message ?? "发送验证码失败");
      return;
    }
    setStep("verify");
    setSuccess(
      result.message ?? `验证码已发送至 ${email}，请查收邮件（含垃圾箱）`
    );
  }

  async function sendEmailSignupOtp(): Promise<boolean> {
    setError("");
    const result = await requestSignupOtp();
    if (!result.ok) {
      setError(result.message ?? "重新发送失败");
      return false;
    }
    setSuccess(result.message ?? "验证码已重新发送");
    return true;
  }

  async function handleEmailVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });

    setLoading(false);
    if (verifyError) {
      setError(getAuthErrorMessage(verifyError));
      return;
    }

    await finishRegistration();
  }

  return (
    <AuthCard
      title="创建账户"
      subtitle="使用邮箱注册"
      footer={
        <p className="mt-6 text-center text-sm text-muted">
          已有账户？{" "}
          <Link href="/login" className="text-accent-light hover:underline">
            立即登录
          </Link>
        </p>
      }
    >
      {error && <div className={errorBoxClass}>{error}</div>}
      {success && <div className={successBoxClass}>{success}</div>}

      {step === "form" ? (
        <form className="mt-6 space-y-4" onSubmit={handleEmailRegister}>
          <div>
            <label className="mb-1.5 block text-sm text-muted">邮箱</label>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted">密码</label>
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
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-accent to-accent-dark py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "注册中..." : "发送邮箱验证码"}
          </button>
        </form>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleEmailVerify}>
          <p className="text-sm text-muted">验证码已发送至 {email}</p>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="6–8 位验证码"
              value={otp}
              onChange={(e) => setOtp(normalizeOtpInput(e.target.value))}
              required
            />
            <OtpField onSend={sendEmailSignupOtp} />
          </div>
          <button
            type="submit"
            disabled={loading || !isOtpComplete(otp)}
            className="w-full rounded-lg bg-gradient-to-r from-accent to-accent-dark py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "验证中..." : "完成注册"}
          </button>
          <button
            type="button"
            className="w-full text-sm text-muted hover:text-accent"
            onClick={() => setStep("form")}
          >
            返回修改邮箱
          </button>
        </form>
      )}
    </AuthCard>
  );
}
