"use client";

import { motion } from "framer-motion";
import { KeyRound, LineChart, RefreshCw, Zap } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "不用折腾官方接口",
    description:
      "省去海外账号、支付、配置等繁琐流程，开通后即可使用。",
  },
  {
    icon: KeyRound,
    title: "一个 Key 调多模型",
    description:
      "统一接口接入 GPT、Gemini、DeepSeek 等模型，开发更省心。",
  },
  {
    icon: RefreshCw,
    title: "稳定调用不中断",
    description: "多线路可用，自动切换，适合业务长期稳定接入。",
  },
  {
    icon: LineChart,
    title: "用量费用看得清",
    description: "实时查看消耗、余额和调用记录，成本更好控制。",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-border/40 bg-white/85 py-16 backdrop-blur-sm sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            为什么选择遇好API
          </h2>
          <p className="mt-2 text-sm text-muted">
            直连主流模型，少折腾，快调用
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-2xl border border-border/80 bg-surface-elevated/90 p-5 text-center shadow-sm"
            >
              <div className="mx-auto mb-3 inline-flex rounded-xl bg-accent/10 p-2.5">
                <feature.icon className="h-5 w-5 text-accent-dark" />
              </div>
              <h3 className="text-sm font-semibold">{feature.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
