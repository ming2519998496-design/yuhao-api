"use client";

import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { href: "/dashboard", label: "数据看板", icon: LayoutDashboard },
  { href: "/console", label: "控制台", icon: Terminal },
  { href: "/recharge", label: "充值", icon: CreditCard },
];

export function DashboardShell({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [balance] = useState(128.5);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setUser(data.user);
      }
      setLoading(false);
    });
  }, [router, supabase.auth]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">加载中...</p>
      </div>
    );
  }

  const sidebar = (
    <>
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark shadow-lg shadow-accent/20">
          <Sparkles className="h-4 w-4 text-white" />
        </span>
        <span className="text-lg font-semibold">
          遇好<span className="text-accent-light">API</span>
        </span>
      </Link>

      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-accent/10 text-accent-dark shadow-sm"
                  : "text-muted hover:bg-accent/5 hover:text-foreground"
              )}
            >
              <item.icon
                className={cn("h-4 w-4", active && "text-accent")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          <BarChart3 className="h-3.5 w-3.5 text-accent" />
          账户余额
        </div>
        <p className="mt-1 text-2xl font-bold text-foreground">
          ¥{balance.toFixed(2)}
        </p>
        <Link
          href="/recharge"
          onClick={() => setMobileOpen(false)}
          className="mt-3 block rounded-lg bg-gradient-to-r from-accent to-accent-dark py-2 text-center text-xs font-semibold text-white transition-all hover:brightness-110"
        >
          立即充值
        </Link>
      </div>
    </>
  );

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />

      <div className="relative flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface/80 p-5 backdrop-blur-sm lg:flex">
          {sidebar}
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative flex h-full w-72 flex-col border-r border-border bg-surface-elevated p-5 shadow-xl">
              <button
                type="button"
                className="absolute right-4 top-4 rounded-lg p-1 text-muted"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface-elevated/90 px-4 py-3 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:bg-accent/10 lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold sm:text-xl">{title}</h1>
                {description && (
                  <p className="hidden text-xs text-muted sm:block">
                    {description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted sm:block">
                {user?.email}
              </span>
              <Link
                href="/"
                className="hidden rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-border-hover hover:text-foreground sm:block"
              >
                返回首页
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-red-300 hover:text-red-500"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">退出</span>
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
