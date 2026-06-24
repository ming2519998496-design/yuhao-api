"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { TypewriterText } from "@/components/typewriter-text";

const HERO_SUBTITLE =
  "一站式 AI 模型 API 接入服务，支持 OpenAI 兼容调用与 Gemini 模型，适合国内开发者、独立产品和中小团队快速接入。";

const models = [
  { name: "GPT", label: "OpenAI" },
  { name: "Gemini", label: "Google" },
  { name: "DeepSeek", label: "DeepSeek" },
];

export function Hero() {
  return (
    <section className="hero-mesh relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 pb-16 pt-24 sm:pt-28">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-lg font-medium text-muted sm:text-xl"
        >
          轻松使用
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="mt-4 whitespace-nowrap text-[clamp(2rem,6.5vw,6rem)] font-bold tracking-tight text-foreground"
        >
          GPT · Gemini · DeepSeek
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
        >
          {models.map((m) => (
            <div
              key={m.name}
              className="flex h-11 min-w-[4.5rem] items-center justify-center rounded-xl border border-border/80 bg-white/70 px-4 text-sm font-semibold text-foreground shadow-sm backdrop-blur-sm sm:h-12 sm:min-w-[5rem]"
              title={m.label}
            >
              {m.name}
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="mt-8 flex flex-col items-center gap-3 px-2"
        >
          <p className="max-w-md text-[calc(0.875rem+7pt)] font-bold leading-relaxed text-muted">
            好用的 AI 模型服务商 · 国内稳定直连
          </p>
          <p className="min-h-[4.5rem] max-w-2xl text-sm leading-relaxed text-muted sm:min-h-[3.25rem]">
            <TypewriterText
              text={HERO_SUBTITLE}
              startDelay={700}
              speed={52}
              pauseMs={5000}
            />
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="mt-10"
        >
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-accent px-10 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all hover:bg-accent-dark hover:shadow-accent/40"
          >
            立即开始
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
