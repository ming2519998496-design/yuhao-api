"use client";

import {
  INTEGRATION_CATEGORY_LABEL,
  INTEGRATION_PRESETS,
  getApiBaseUrl,
  type IntegrationPreset,
} from "@/lib/api-client-config";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";

const CATEGORIES: IntegrationPreset["category"][] = [
  "sdk",
  "ide",
  "framework",
  "app",
];

type Props = {
  apiKey?: string;
  model?: string;
  className?: string;
};

export function IntegrationConfigsPanel({
  apiKey = "yh_your_api_key",
  model = "gpt-4o-mini",
  className,
}: Props) {
  const [category, setCategory] =
    useState<IntegrationPreset["category"]>("ide");
  const [activeId, setActiveId] = useState("cursor");
  const [copied, setCopied] = useState(false);
  const baseUrl = useMemo(() => getApiBaseUrl(), []);

  const presets = useMemo(
    () => INTEGRATION_PRESETS.filter((p) => p.category === category),
    [category]
  );

  const active =
    presets.find((p) => p.id === activeId) ??
    presets[0] ??
    INTEGRATION_PRESETS[0];

  const content = useMemo(
    () => active.build({ apiKey, model, baseUrl }),
    [active, apiKey, model, baseUrl]
  );

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">一键配置</h3>
          <p className="mt-1 font-mono text-xs text-muted">
            Base URL: {baseUrl}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-accent/40"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              已复制
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              复制配置
            </>
          )}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setCategory(cat);
              const first = INTEGRATION_PRESETS.find((p) => p.category === cat);
              if (first) setActiveId(first.id);
            }}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              category === cat
                ? "bg-accent/15 text-accent-dark"
                : "text-muted hover:bg-accent/5 hover:text-foreground"
            )}
          >
            {INTEGRATION_CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveId(p.id)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs transition-colors",
              active.id === p.id
                ? "border-accent/40 bg-accent/10 text-accent-dark"
                : "border-border text-muted hover:border-accent/30 hover:text-foreground"
            )}
            title={p.description}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted">{active.description}</p>

      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed text-slate-600">
        {content}
      </pre>
    </div>
  );
}
