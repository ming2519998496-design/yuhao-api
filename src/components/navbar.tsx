"use client";

import { motion } from "framer-motion";
import { Menu, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "首页" },
  { href: "/console", label: "控制台" },
  { href: "/docs", label: "使用教程" },
  { href: "/support", label: "在线客服" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "glass py-3 shadow-lg shadow-accent/10" : "py-5"
      )}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark shadow-lg shadow-accent/30">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            遇好<span className="text-accent-light">API</span>
          </span>
        </Link>

        <motion.div
          className="hidden items-center gap-6 lg:gap-8 md:flex"
          initial={false}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </motion.div>

        <motion.div
          className="hidden items-center gap-3 md:flex"
          initial={false}
        >
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:text-foreground"
          >
            登录
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-gradient-to-r from-accent to-accent-dark px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/30 transition-all hover:shadow-accent/50 hover:brightness-110"
          >
            免费注册
          </Link>
        </motion.div>

        <button
          type="button"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-accent/10 hover:text-foreground md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "关闭菜单" : "打开菜单"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="glass border-t border-border md:hidden"
        >
          <motion.div
            className="flex flex-col gap-1 px-4 py-4"
            initial={false}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-accent/10 hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2.5 text-center text-sm text-muted hover:bg-accent/10"
                onClick={() => setMobileOpen(false)}
              >
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gradient-to-r from-accent to-accent-dark py-2.5 text-center text-sm font-medium text-white"
                onClick={() => setMobileOpen(false)}
              >
                免费注册
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.header>
  );
}
