"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SupportContactContent } from "@/components/support/support-contact-content";

export default function SupportPage() {
  return (
    <DashboardShell
      title="联系客服"
      description="充值、令牌与 API 调用问题，可通过以下方式联系我们"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <SupportContactContent />
      </div>
    </DashboardShell>
  );
}
