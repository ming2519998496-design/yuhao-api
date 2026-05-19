import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface-elevated/80 p-8 backdrop-blur-xl">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark">
            <Sparkles className="h-5 w-5 text-white" />
          </span>
          <span className="text-xl font-semibold">遇好API</span>
        </Link>
        <h1 className="text-center text-2xl font-bold">登录账户</h1>
        <p className="mt-2 text-center text-sm text-muted">
          演示页面 · 表单尚未接入后端
        </p>
        <form className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-muted">
              邮箱
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent/50"
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
              placeholder="••••••••"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <button
            type="button"
            className="w-full rounded-lg bg-gradient-to-r from-accent to-accent-dark py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
          >
            登录
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          还没有账户？{" "}
          <Link href="/register" className="text-accent-light hover:underline">
            免费注册
          </Link>
        </p>
      </div>
    </div>
  );
}
