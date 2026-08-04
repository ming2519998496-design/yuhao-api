import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

export const DOCS_NAV: Array<{
  href: string;
  label: string;
  exact?: boolean;
}> = [
  { href: "/docs", label: "文档首页", exact: true },
  { href: "/docs/quickstart", label: "快速开始" },
  { href: "/docs/api", label: "API 参考" },
  { href: "/docs/integrations", label: "一键配置" },
  { href: "/docs/errors", label: "错误码" },
  { href: "/docs/compatibility", label: "兼容说明" },
];

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  pathname: string;
};

export function DocsShell({ title, description, children, pathname }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-28 lg:flex-row lg:gap-10">
        <aside className="w-full shrink-0 lg:w-52">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            开发者文档
          </p>
          <nav className="flex flex-row flex-wrap gap-1 lg:flex-col lg:gap-0.5">
            {DOCS_NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent/10 font-medium text-accent-dark"
                      : "text-muted hover:bg-accent/5 hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 hidden space-y-2 text-xs text-muted lg:block">
            <Link href="/playground" className="block hover:text-accent-dark">
              API 调试 →
            </Link>
            <Link href="/pricing" className="block hover:text-accent-dark">
              价目表 →
            </Link>
            <Link href="/console" className="block hover:text-accent-dark">
              令牌管理 →
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-2 text-muted">{description}</p>
          ) : null}
          <div className="mt-8 space-y-8">{children}</div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export function DocsSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}
