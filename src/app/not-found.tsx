import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { ArrowLeft, Home, KeyRound, MessageCircle, Receipt } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "页面未找到 · 遇好API",
  description: "您访问的页面不存在或已被移除",
};

const links = [
  { href: "/", label: "返回首页", icon: Home },
  { href: "/console", label: "令牌管理", icon: KeyRound },
  { href: "/pricing", label: "价格说明", icon: Receipt },
  { href: "/support", label: "联系客服", icon: MessageCircle },
];

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-8xl font-bold tabular-nums tracking-tight text-gradient">
            404
          </p>
          <h1 className="mt-4 text-2xl font-semibold text-foreground">
            页面未找到
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            您访问的链接可能已失效、地址输入有误，或该页面已被移除。
            请返回首页，或从下方入口继续浏览。
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-accent/40 hover:bg-accent/5"
              >
                <Icon className="h-4 w-4 text-accent" />
                {label}
              </Link>
            ))}
          </div>

          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-accent-dark hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            回到遇好API 首页
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
