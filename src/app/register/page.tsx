"use client";

import { AuthCard } from "@/components/auth/auth-card";
import {
  errorBoxClass,
  inputClass,
  OtpField,
  successBoxClass,
} from "@/components/auth/otp-field";
import { MethodTabs, type AuthMethod } from "@/components/auth/method-tabs";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { isPhoneAuthEnabled } from "@/lib/phone-auth-feature";
import { isOtpComplete, normalizeOtpInput } from "@/lib/otp";
import { formatPhoneE164, maskPhone } from "@/lib/phone";
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

const phoneAuthOn = isPhoneAuthEnabled();

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [method, setMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const phoneE164 = useMemo(() => formatPhoneE164(phone), [phone]);

  useEffect(() => {
    const aff = new URLSearchParams(window.location.search).get("aff");
    if (aff) storeAffCode(aff);
  }, []);

  function switchMethod(next: AuthMethod) {
    setMethod(next);
    setStep("form");
    setError("");
    setSuccess("");
    setOtp("");
  }

  async function finishRegistration() {
    await syncProfileClient(getStoredAffCode());
    clearStoredAffCode();
    router.push("/dashboard?welcome=1");
    router.refresh();
  }

  async function requestEmailSignupOtp(): Promise<{
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

  async function requestPhoneSignupOtp(): Promise<{
    ok: boolean;
    message?: string;
  }> {
    const res = await fetch("/api/auth/register/send-phone-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: data.error ?? "发送验证码失败" };
    }
    return { ok: true, message: data.message as string | undefined };
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const result =
      method === "email"
        ? await requestEmailSignupOtp()
        : await requestPhoneSignupOtp();

    setLoading(false);
    if (!result.ok) {
      setError(result.message ?? "发送验证码失败");
      return;
    }
    setStep("verify");
    setSuccess(
      result.message ??
        (method === "email"
          ? `验证码已发送至 ${email}，请查收邮件（含垃圾箱）`
          : `验证码已发送至 ${maskPhone(phoneE164)}`)
    );
  }

  async function resendSignupOtp(): Promise<boolean> {
    setError("");
    const result =
      method === "email"
        ? await requestEmailSignupOtp()
        : await requestPhoneSignupOtp();
    if (!result.ok) {
      setError(result.message ?? "重新发送失败");
      return false;
    }
    setSuccess(result.message ?? "验证码已重新发送");
    return true;
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: verifyError } =
      method === "email"
        ? await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: "signup",
          })
        : await supabase.auth.verifyOtp({
            phone: phoneE164,
            token: otp,
            type: "sms",
          });

    setLoading(false);
    if (verifyError) {
      setError(getAuthErrorMessage(verifyError));
      return;
    }

    await finishRegistration();
  }

  const verifyTarget =
    method === "email" ? email : maskPhone(phoneE164);

  return (
    <AuthCard
      title="创建账户"
      subtitle={
        phoneAuthOn
          ? "邮箱或手机号注册，设置密码后验证；新用户赠送 ¥1 体验金"
          : "使用邮箱注册，新用户赠送 ¥1 体验金"
      }
      footer={
        <p className="mt-6 text-center text-sm text-muted">
          已有账户？{" "}
          <Link href="/login" className="text-accent-light hover:underline">
            立即登录
          </Link>
        </p>
      }
    >
      {phoneAuthOn && <MethodTabs method={method} onChange={switchMethod} />}

      {error && <div className={errorBoxClass}>{error}</div>}
      {success && <div className={successBoxClass}>{success}</div>}

      {step === "form" ? (
        <form className="mt-6 space-y-4" onSubmit={handleRegister}>
          {phoneAuthOn && method === "phone" ? (
            <div>
              <label className="mb-1.5 block text-sm text-muted">手机号</label>
              <input
                type="tel"
                className={inputClass}
                placeholder="11 位中国大陆手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          ) : (
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
          )}
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
            {phoneAuthOn && (
              <p className="mt-1 text-xs text-muted">
                绑定邮箱或手机后，登录时共用此密码
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-accent to-accent-dark py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading
              ? "发送中..."
              : phoneAuthOn && method === "phone"
                ? "发送短信验证码"
                : "发送邮箱验证码"}
          </button>
        </form>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleVerify}>
          <p className="text-sm text-muted">验证码已发送至 {verifyTarget}</p>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="6 位验证码"
              value={otp}
              onChange={(e) => setOtp(normalizeOtpInput(e.target.value))}
              required
            />
            <OtpField onSend={resendSignupOtp} />
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
            onClick={() => {
              setStep("form");
              setOtp("");
            }}
          >
            返回修改{phoneAuthOn && method === "phone" ? "手机号" : "邮箱"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
