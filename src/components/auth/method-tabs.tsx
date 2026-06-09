"use client";

import { cn } from "@/lib/utils";

export type AuthMethod = "email" | "phone";

export function MethodTabs({
  method,
  onChange,
}: {
  method: AuthMethod;
  onChange: (m: AuthMethod) => void;
}) {
  return (
    <div className="mt-6 flex gap-2 rounded-xl border border-border bg-background p-1">
      <button
        type="button"
        onClick={() => onChange("email")}
        className={cn(
          "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
          method === "email"
            ? "bg-accent/10 text-accent-dark shadow-sm"
            : "text-muted hover:text-foreground"
        )}
      >
        邮箱
      </button>
      <button
        type="button"
        onClick={() => onChange("phone")}
        className={cn(
          "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
          method === "phone"
            ? "bg-accent/10 text-accent-dark shadow-sm"
            : "text-muted hover:text-foreground"
        )}
      >
        手机号
      </button>
    </div>
  );
}
