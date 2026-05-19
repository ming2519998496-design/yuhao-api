"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CtaBanner() {
  return (
    <section className="pt-4 pb-16 sm:pt-8 sm:pb-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
      >
        <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-r from-accent/15 via-accent-light/10 to-accent/20 px-8 py-12 text-center sm:px-16 sm:py-16">
          <motion.div
            className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent"
            initial={false}
          />
          <h2 className="relative text-2xl font-bold sm:text-3xl">
            准备好构建下一代 AI 产品了吗？
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-muted">
            无需信用卡，5 分钟即可完成首次调用。
          </p>
          <Link
            href="/register"
            className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-dark px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-transform hover:scale-[1.02] hover:brightness-110"
          >
            免费创建账户
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
