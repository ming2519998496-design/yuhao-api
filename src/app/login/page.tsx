"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { errorBoxClass, inputClass } from "@/components/auth/otp-field";
import { ACCOUNT_FROZEN_MESSAGE } from "@/lib/account-frozen-messages";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const justRegistered = searchParams.get("registered") === "true";
  const accountFrozen = searchParams.get("frozen") === "1";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          data.frozen && typeof data.error === "string"
            ? data.error
            : typeof data.error === "string"
              ? getAuthErrorMessage(data.error)
              : "登录失败，请稍后重试"
        );
        setLoading(false);
        return;
      }

      router.push(data.isAdmin ? "/admin" : "/dashboard");
      router.refresh();
    } catch (e) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="登录账户"
      subtitle="使用邮箱和密码登录"
      footer={
        <p className="mt-6 text-center text-sm text-muted">
          还没有账户？{" "}
          <Link href="/register" className="text-accent-light hover:underline">
            免费注册
          </Link>
        </p>
      }
    >
      {justRegistered && (
        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-600">
          注册成功！请登录您的账户
        </div>
      )}

      {accountFrozen && (
        <div className={`${errorBoxClass} mt-4`}>{ACCOUNT_FROZEN_MESSAGE}</div>
      )}

      {error && <div className={`${errorBoxClass} mt-6`}>{error}</div>}

      <form className="mt-6 space-y-4" onSubmit={handleLogin}>
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
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm text-muted">密码</label>
            <Link
              href="/forgot-password"
              className="text-xs text-accent hover:underline"
            >
              忘记密码？
            </Link>
          </div>
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-accent to-accent-dark py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "登录中..." : "登录"}
        </button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
