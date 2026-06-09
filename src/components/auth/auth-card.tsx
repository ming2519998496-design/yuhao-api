import { SiteLogo } from "@/components/brand/site-logo";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface-elevated/80 p-8 backdrop-blur-xl">
        <SiteLogo
          size="auth"
          href="/"
          className="mb-8 justify-center"
        />
        <h1 className="text-center text-2xl font-bold">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-center text-sm text-muted">{subtitle}</p>
        )}
        {children}
        {footer}
      </div>
    </div>
  );
}
