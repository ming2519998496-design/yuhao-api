"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { UserGuideContent } from "@/components/dashboard/user-guide-content";

export default function UserGuidePage() {
  return (
    <DashboardShell
      title="使用说明"
      description="注册、充值、AI 对话与令牌管理的操作指南"
    >
      <div className="mx-auto max-w-3xl">
        <UserGuideContent />
      </div>
    </DashboardShell>
  );
}
