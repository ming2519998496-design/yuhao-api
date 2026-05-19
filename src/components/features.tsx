"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Gauge,
  KeyRound,
  Layers,
  RefreshCw,
  Wallet,
} from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "主流大模型一键通",
    description:
      "聚合 DeepSeek、Claude、GPT 等核心模型。一个 API 轻松直通全网能力，无需维护多套 SDK。",
    gradient: "from-accent/20 to-accent-dark/20",
  },
  {
    icon: RefreshCw,
    title: "故障自动切换机制",
    description:
      "底层渠道波动时秒级容灾，自动无缝重试或切换至备用健康渠道，确保您的 AI 业务永远不掉链子。",
    gradient: "from-accent-light/25 to-accent/20",
  },
  {
    icon: Wallet,
    title: "无门槛充值与超值计费",
    description:
      "零隐形消费，1 元即可充值起用。提供极具竞争力的官方原价级费率，让个人与初创团队用得起、不肉疼。",
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
  {
    icon: BarChart3,
    title: "透明清晰的用量看板",
    description:
      "控制台数据无延迟，每笔请求的 Token 消耗和费用清晰可查。拒绝账单糊涂账，精准把控研发成本。",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  {
    icon: KeyRound,
    title: "子密钥额度防刷控制",
    description:
      "支持自主创建多个 API Key，可独立设置额度上限与过期时间。无论是多项目测试还是防刷都轻松掌控。",
    gradient: "from-rose-500/20 to-pink-500/20",
  },
  {
    icon: Gauge,
    title: "本土优化与极速响应",
    description:
      "针对国内开发环境专项优化，精选高带宽直连节点，无需复杂代理，大幅降低请求延迟，响应快且稳。",
    gradient: "from-accent/15 to-accent-dark/25",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function Features() {
  return (
    <section id="features" className="relative pt-4 pb-12 sm:pt-8 sm:pb-14">
      <motion.div
        className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/50 to-transparent"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-accent-light">
            核心能力
          </p>
          <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            为规模化 AI 应用而生
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            从初创团队到大型企业，遇好API 提供生产级基础设施，让你专注产品创新。
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.article
              key={feature.title}
              variants={item}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface/80 p-6 transition-all duration-300 hover:border-border-hover hover:bg-surface-elevated/80"
            >
              <div
                className={`mb-5 inline-flex rounded-xl bg-gradient-to-br ${feature.gradient} p-3 ring-1 ring-accent/15`}
              >
                <feature.icon className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
              <motion.div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-accent/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
