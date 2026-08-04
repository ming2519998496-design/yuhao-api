import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/60 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-muted">
          © {new Date().getFullYear()} 遇好API · 好用的 AI 模型服务商
        </p>
        <div className="flex gap-4 text-sm text-muted">
          <Link href="/docs" className="hover:text-foreground">
            开发者文档
          </Link>
          <Link href="/docs/integrations" className="hover:text-foreground">
            一键配置
          </Link>
          <Link href="/support" className="hover:text-foreground">
            联系客服
          </Link>
          <Link href="/login" className="hover:text-foreground">
            登录
          </Link>
          <Link href="/register" className="hover:text-accent-dark">
            注册
          </Link>
        </div>
      </div>
    </footer>
  );
}
