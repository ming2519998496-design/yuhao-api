import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PricingTransparencyView } from "@/components/pricing/pricing-transparency-view";
import { getPricingTiers } from "@/lib/pricing-transparency";

export const metadata = {
  title: "价格说明 · 遇好API",
  description:
    "平台价 = 官方美元价 × 7.2 ×（1 + 服务费率）。经济档 +15%、标准档 +20%、旗舰档 +18%、图像/视频 +30%。",
};

export default function PricingPage() {
  return (
    <DashboardShell title="价格说明" description="官方价 + 服务费，透明可查">
      <div className="mx-auto max-w-4xl">
        <PricingTransparencyView tiers={getPricingTiers()} />
      </div>
    </DashboardShell>
  );
}
