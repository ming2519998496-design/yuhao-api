"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user?.identities?.length === 0) {
      setError("该邮箱已注册，请直接登录");
      setLoading(false);
      return;
    }

    // 注册成功 — 跳转到登录页（邮箱确认模式下提示用户）
    setLoading(false);
    router.push("/login?registered=true");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
      <div className="pointer-events-none absolute right-1/4 top-1/4 h-96 w-96 rounded-full bg-accent/15 blur-[120px]" />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface-elevated/80 p-8 backdrop-blur-xl">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark">
            <Sparkles className="h-5 w-5 text-white" />
          </span>
          <span className="text-xl font-semibold">遇好API</span>
        </Link>
        <h1 className="text-center text-2xl font-bold">创建账户</h1>
        <p className="mt-2 text-center text-sm text-muted">
          注册后即可使用 AI API 服务
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleRegister}>
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm text-muted">
              姓名
            </label>
            <input
              id="name"
              type="text"
              placeholder="张三"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent/50"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-muted">
              邮箱
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent/50"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm text-muted"
            >
              密码
            </label>
            <input
              id="password"
              type="password"
              placeholder="至少 8 位字符"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent/50"
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-accent to-accent-dark py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "注册中..." : "免费注册"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          已有账户？{" "}
          <Link href="/login" className="text-accent-light hover:underline">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
