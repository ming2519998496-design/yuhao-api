"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Copy, Terminal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const codeSnippet = `curl https://api.yuhao.ai/v1/chat/completions \\
  -H "Authorization: Bearer $YUHAO_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "你好"}]
  }'`;

export function Hero() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-14">
      <motion.div
        className="pointer-events-none absolute inset-0 grid-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      />
      <div className="noise pointer-events-none absolute inset-0 opacity-60" />

      <motion.div
        className="pointer-events-none absolute -left-32 top-20 h-[500px] w-[500px] rounded-full bg-accent/15 blur-[120px]"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-32 top-40 h-[400px] w-[400px] rounded-full bg-accent/10 blur-[100px]"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl"
            >
              <span className="text-gradient">遇好API</span>
              <span className="mt-3 block text-xl font-bold text-foreground sm:text-2xl lg:text-3xl">
                全能智惠 · 更低成本 · 零门槛落地
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 max-w-xl text-sm leading-relaxed text-muted"
            >
              专为大模型高频调用场景打造。提供极致稳定的 API
              中转方案，聚合国内外顶尖闭源及开源模型，零门槛平替。用更低的预算，跑出更高效的生产力。
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-dark px-6 py-3.5 text-sm font-semibold text-white glow-accent transition-all hover:brightness-110"
              >
                获取API密钥
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-6 py-3.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-border-hover hover:bg-white"
              >
                查看文档
              </Link>
            </motion.div>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted"
            >
              {["无需信用卡", "5 分钟完成接入", "7×24 技术支持"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    {item}
                  </li>
                )
              )}
            </motion.ul>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="relative"
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated/80 px-4 py-1.5 text-sm text-muted shadow-sm backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              OpenAI 原生接口，国内直连
            </motion.div>

            <motion.div
              className="absolute -inset-4 top-8 rounded-2xl bg-gradient-to-r from-accent/25 via-accent-light/15 to-accent-dark/20 blur-2xl"
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div className="relative overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-xl shadow-accent/10">
              <motion.div
                className="flex items-center justify-between border-b border-border px-4 py-3"
                initial={false}
              >
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-cyan" />
                  <span className="font-mono text-xs text-muted">
                    quickstart.sh
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-accent/10 hover:text-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      复制
                    </>
                  )}
                </button>
              </motion.div>
              <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-slate-600 sm:p-5">
                <code>{codeSnippet}</code>
              </pre>
            </motion.div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
