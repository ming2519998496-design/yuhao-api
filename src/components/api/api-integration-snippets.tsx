"use client";

import {
  buildCurlSnippet,
  buildCursorSnippet,
  buildNodeSnippet,
  buildPythonSnippet,
  getApiBaseUrl,
} from "@/lib/api-client-config";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";

const TABS = [
  { id: "curl" as const, label: "curl" },
  { id: "python" as const, label: "Python" },
  { id: "node" as const, label: "Node.js" },
  { id: "cursor" as const, label: "Cursor" },
];

type TabId = (typeof TABS)[number]["id"];

type Props = {
  apiKey: string;
  model: string;
  prompt?: string;
  className?: string;
  title?: string;
};

export function ApiIntegrationSnippets({
  apiKey,
  model,
  prompt,
  className,
  title = "复制接入配置",
}: Props) {
  const [tab, setTab] = useState<TabId>("curl");
  const [copied, setCopied] = useState(false);
  const baseUrl = useMemo(() => getApiBaseUrl(), []);

  const snippets = useMemo(
    () => ({
      curl: buildCurlSnippet({ apiKey, model, prompt, baseUrl }),
      python: buildPythonSnippet({ apiKey, model, baseUrl }),
      node: buildNodeSnippet({ apiKey, model, baseUrl }),
      cursor: buildCursorSnippet({ apiKey, baseUrl }),
    }),
    [apiKey, model, prompt, baseUrl]
  );

  async function handleCopy() {
    await navigator.clipboard.writeText(snippets[tab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface-elevated/80 p-4",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-0.5 font-mono text-xs text-muted">
            Base URL: {baseUrl}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent/40"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              已复制
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              复制{tab === "cursor" ? " Cursor 配置" : "代码"}
            </>
          )}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              tab === item.id
                ? "bg-accent/15 text-accent-dark"
                : "text-muted hover:bg-accent/5 hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed text-slate-600">
        {snippets[tab]}
      </pre>
    </div>
  );
}
