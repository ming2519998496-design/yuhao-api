import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  className,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  trend?: { value: string; up: boolean };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm transition-shadow hover:shadow-md hover:shadow-accent/5",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
          <Icon className="h-5 w-5 text-accent" />
        </span>
      </div>
      {trend && (
        <p
          className={cn(
            "mt-3 text-xs font-medium",
            trend.up ? "text-emerald-600" : "text-amber-600"
          )}
        >
          {trend.up ? "↑" : "↓"} {trend.value} 较昨日
        </p>
      )}
    </div>
  );
}
