"use client";

import { dismissOnboarding, isOnboardingDismissed } from "@/lib/onboarding-storage";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  KeyRound,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  hasKeys: boolean;
  hasApiCalls: boolean;
  balance?: number;
};

const STEPS = [
  {
    id: "key",
    title: "创建 API Key",
    description: "在令牌管理生成 yh_ 开头的密钥（完整内容仅显示一次，请立即复制）",
    href: "/console?create=1",
    icon: KeyRound,
    done: (p: Props) => p.hasKeys,
  },
  {
    id: "playground",
    title: "Playground 发一条测试",
    description: "粘贴密钥，选择模型，确认能收到回复并扣费成功",
    href: "/playground",
    icon: Terminal,
    done: (p: Props) => p.hasApiCalls,
  },
  {
    id: "integrate",
    title: "复制配置接入项目",
    description: "将 Base URL 与 Key 配置到 Cursor、Python 或 Node 项目",
    href: "/docs/quickstart",
    icon: BookOpen,
    done: (p: Props) => p.hasApiCalls,
  },
] as const;

export function OnboardingGuide(props: Props) {
  const [visible, setVisible] = useState(false);
  const completedCount = STEPS.filter((s) => s.done(props)).length;
  const allDone = completedCount === STEPS.length;

  useEffect(() => {
    if (isOnboardingDismissed()) return;
    if (!props.hasKeys || !props.hasApiCalls) {
      setVisible(true);
    }
  }, [props.hasKeys, props.hasApiCalls]);

  if (!visible) return null;

  function handleDismiss() {
    dismissOnboarding();
    setVisible(false);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-surface-elevated to-surface-elevated p-6 shadow-sm">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-4 top-4 rounded-lg p-1 text-muted hover:bg-accent/10 hover:text-foreground"
        aria-label="关闭引导"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15">
          <Sparkles className="h-5 w-5 text-accent-dark" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {allDone ? "接入完成 🎉" : "5 分钟跑通第一次调用"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {allDone
              ? "你已成功调用 API。可在 Playground 继续调试，或查看快速开始文档接入自己的项目。"
              : `新用户已赠送 ¥${(props.balance ?? 1).toFixed(2)} 体验金，按下面 ${STEPS.length} 步即可完成首次调用。`}
          </p>
          <p className="mt-2 text-xs text-muted">
            进度 {completedCount}/{STEPS.length}
          </p>
        </div>
      </div>

      <ol className="mt-6 space-y-3">
        {STEPS.map((step, index) => {
          const done = step.done(props);
          const Icon = step.icon;
          return (
            <li
              key={step.id}
              className={cn(
                "flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                done
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border bg-background/60"
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 shrink-0 text-muted">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {index + 1}. {step.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{step.description}</p>
                </div>
              </div>
              {!done && (
                <Link
                  href={step.href}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent/10 px-4 py-2 text-sm font-semibold text-accent-dark hover:bg-accent/15"
                >
                  <Icon className="h-4 w-4" />
                  去操作
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {allDone && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/playground"
            className="rounded-lg bg-accent/10 px-4 py-2 text-sm font-semibold text-accent-dark hover:bg-accent/15"
          >
            继续调试
          </Link>
          <Link
            href="/docs/quickstart"
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:border-accent/40"
          >
            查看快速开始
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground"
          >
            收起引导
          </button>
        </div>
      )}
    </div>
  );
}
