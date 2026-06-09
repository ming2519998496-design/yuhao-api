import {
  getPricingFormulaText,
  type PricingTierId,
  type PricingTierInfo,
} from "@/lib/pricing-transparency";
import { cn } from "@/lib/utils";
import { FileText, Flag, ImageIcon, Star, type LucideIcon } from "lucide-react";

const TIER_ICONS: Record<PricingTierId, LucideIcon> = {
  economy: FileText,
  standard: Star,
  flagship: Flag,
  image: ImageIcon,
};

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-border/70" />
      <span className="shrink-0 text-sm font-medium text-muted">{label}</span>
      <div className="h-px flex-1 bg-border/70" />
    </div>
  );
}

export function PricingTransparencyView({
  tiers,
  className,
}: {
  tiers: PricingTierInfo[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-gradient-to-b from-sky-50/90 via-white to-white px-5 py-10 shadow-sm ring-1 ring-border/40 sm:px-8 sm:py-12",
        className
      )}
    >
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          价格说明
        </h1>
      </div>

      <section className="mt-10">
        <SectionDivider label="总公式（一眼看懂）" />
        <div className="mt-5 rounded-2xl bg-white px-6 py-8 text-center shadow-[0_4px_24px_rgba(48,169,255,0.08)] ring-1 ring-border/50 sm:px-10 sm:py-10">
          <p className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {getPricingFormulaText()}
          </p>
        </div>
      </section>

      <section className="mt-10">
        <SectionDivider label="四档服务费" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {tiers.map((tier) => {
            const Icon = TIER_ICONS[tier.id];
            return (
              <div
                key={tier.id}
                className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)] ring-1 ring-border/50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <Icon className="h-5 w-5 text-accent-dark" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground">{tier.label}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    {tier.summary}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-accent/10 px-3 py-1 text-sm font-bold text-accent-dark">
                  +{tier.markupPercent}%
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
