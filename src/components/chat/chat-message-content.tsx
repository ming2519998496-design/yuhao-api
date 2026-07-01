"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { normalizeChatMathDelimiters } from "@/lib/chat-math-normalize";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-1 text-lg font-semibold text-foreground">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 text-base font-semibold text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-3 text-sm font-semibold text-foreground">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  code: ({ className, children, ...props }) => {
    if (
      className?.includes("math-inline") ||
      className?.includes("math-display")
    ) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code
          className={`block overflow-x-auto rounded-lg bg-surface px-3 py-2 font-mono text-xs ${className ?? ""}`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-surface px-1 py-0.5 font-mono text-[0.85em]"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto last:mb-0">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-accent/40 pl-3 text-muted last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-border" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-dark underline underline-offset-2 hover:text-accent"
    >
      {children}
    </a>
  ),
};

export function ChatMessageContent({
  content,
  streaming,
}: {
  content: string;
  streaming?: boolean;
}) {
  const normalized = useMemo(
    () => normalizeChatMathDelimiters(content),
    [content]
  );

  if (streaming) {
    return (
      <div className="chat-markdown whitespace-pre-wrap break-words">
        {content}
        <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-accent align-middle" />
      </div>
    );
  }

  return (
    <div className="chat-markdown break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={markdownComponents}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
