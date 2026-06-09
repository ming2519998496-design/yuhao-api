"use client";

import { createClient } from "@/lib/supabase";
import { motion } from "framer-motion";
import { SiteLogo } from "@/components/brand/site-logo";
import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

export function Navbar() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.refresh();
  }

  const emailLabel = user?.email ?? "";

  const desktopAuth = !authReady ? (
    <div className="hidden h-9 w-32 sm:block" aria-hidden />
  ) : user ? (
    <div className="hidden items-center gap-2 sm:flex">
      <Link
        href="/dashboard"
        className="max-w-[200px] truncate rounded-full px-4 py-2 text-sm text-muted transition-colors hover:bg-white/60 hover:text-foreground"
        title={emailLabel}
      >
        {emailLabel}
      </Link>
      <button
        type="button"
        onClick={() => void handleLogout()}
        className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-white/70 px-4 py-2 text-sm text-muted transition-colors hover:border-red-200 hover:text-red-600"
      >
        <LogOut className="h-4 w-4" />
        退出
      </button>
    </div>
  ) : (
    <div className="hidden items-center gap-2 sm:flex">
      <Link
        href="/login"
        className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-foreground"
      >
        登录
      </Link>
      <Link
        href="/register"
        className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        注册
      </Link>
    </div>
  );

  const mobileAuth = authReady && (
    <div className="border-t border-border/60 bg-white/90 px-4 py-4 backdrop-blur-md sm:hidden">
      {user ? (
        <>
          <Link
            href="/dashboard"
            className="block truncate rounded-lg px-3 py-2.5 text-sm font-medium text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            {emailLabel}
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm text-muted hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            退出
          </button>
        </>
      ) : (
        <>
          <Link
            href="/login"
            className="block rounded-lg px-3 py-2.5 text-sm text-muted"
            onClick={() => setMobileOpen(false)}
          >
            登录
          </Link>
          <Link
            href="/register"
            className="mt-2 block rounded-full bg-foreground py-2.5 text-center text-sm font-medium text-white"
            onClick={() => setMobileOpen(false)}
          >
            注册
          </Link>
        </>
      )}
    </div>
  );

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <SiteLogo size="md" />

        {desktopAuth}

        <button
          type="button"
          className="rounded-lg p-2 text-muted hover:bg-white/60 sm:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "关闭菜单" : "打开菜单"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileOpen && mobileAuth}
    </motion.header>
  );
}
