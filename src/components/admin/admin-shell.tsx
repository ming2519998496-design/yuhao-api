"use client";

import {
  BarChart3,
  ClipboardList,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  Tags,
  Users,
  X,
} from "lucide-react";
import { SiteLogo } from "@/components/brand/site-logo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "总览", icon: LayoutDashboard },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/usage", label: "调用记录", icon: BarChart3 },
  { href: "/admin/settings/payment", label: "收款账户", icon: CreditCard },
  { href: "/admin/settings/upstream-keys", label: "上游 API Key", icon: KeyRound },
  { href: "/admin/settings/model-pricing", label: "模型价格", icon: Tags },
  { href: "/admin/settings/announcements", label: "公告通知", icon: Megaphone },
  { href: "/admin/recharges", label: "充值确认", icon: CreditCard },
  { href: "/admin/orders", label: "订单管理", icon: ClipboardList },
  { href: "/admin/settings/security", label: "账户安全", icon: Settings },
];

export function AdminShell({
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
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [email, setEmail] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setEmail(user.email ?? "");
      await fetch("/api/auth/sync-profile", { method: "POST" });
      const res = await fetch("/api/admin/stats");
      if (res.status === 403) {
        setDenied(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        router.push("/login");
        return;
      }
      setLoading(false);
    }
    init();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">验证权限中...</p>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="text-lg font-semibold">无管理后台访问权限</p>
        <p className="text-sm text-muted">
          当前登录邮箱：<span className="font-medium text-foreground">{email}</span>
        </p>
        <p className="max-w-md text-sm text-muted">
          请使用管理员邮箱登录（.env.local 中 ADMIN_EMAILS，当前应为
          ming2519998496@gmail.com），或退出后重新登录。
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-accent px-4 py-2 text-sm text-white"
          >
            切换账号登录
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
          >
            用户控制台
          </Link>
        </div>
      </div>
    );
  }

  const sidebar = (
    <>
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <SiteLogo size="sm" showText={false} href={null} />
        <span className="text-lg font-semibold">
          遇好<span className="text-accent-light">API</span>
          <span className="ml-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
            管理
          </span>
        </span>
      </Link>
      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-accent/10 text-accent-dark"
                  : "text-muted hover:bg-accent/5 hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", active && "text-accent")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted hover:bg-accent/5"
        >
          <Settings className="h-3.5 w-3.5" />
          切换到用户前台
        </Link>
      </div>
    </>
  );

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="relative flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface/80 p-5 lg:flex">
          {sidebar}
        </aside>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-foreground/20"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative flex h-full w-72 flex-col border-r bg-surface-elevated p-5">
              <button
                type="button"
                className="absolute right-4 top-4"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
              {sidebar}
            </aside>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface-elevated/90 px-4 py-3 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-2 lg:hidden"
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
              <span className="hidden text-sm text-muted sm:block">{email}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-red-500"
              >
                <LogOut className="h-4 w-4" />
                退出
              </button>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
