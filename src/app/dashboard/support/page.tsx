"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SupportContactContent } from "@/components/support/support-contact-content";
import { Users } from "lucide-react";
import Image from "next/image";

export default function SupportPage() {
  return (
    <DashboardShell
      title="联系客服"
      description="充值、令牌与 API 调用问题，可通过以下方式联系我们"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5 text-accent" />
            用户交流群
          </h2>
          <p className="mt-1 text-sm text-muted">
            扫码加入微信群，获取使用帮助与最新公告
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background">
            <Image
              src="/support/wechat-group-qr.png"
              alt="遇好API 用户交流群微信二维码"
              width={1190}
              height={662}
              className="h-auto w-full"
              priority
            />
          </div>
        </div>
        <SupportContactContent />
      </div>
    </DashboardShell>
  );
}
