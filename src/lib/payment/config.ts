import type { MerchantProfile, PaymentConfig, PayProviderId } from "@/lib/payment/types";

const MERCHANT_PROFILES: MerchantProfile[] = [
  "personal",
  "sole_trader",
  "enterprise",
];

function parseMerchantProfile(raw: string | undefined): MerchantProfile {
  const v = raw?.trim().toLowerCase();
  if (v && MERCHANT_PROFILES.includes(v as MerchantProfile)) {
    return v as MerchantProfile;
  }
  return "personal";
}

function parseProvider(raw: string | undefined): PayProviderId {
  const v = raw?.trim().toLowerCase();
  if (v === "xorpay") return "xorpay";
  if (v === "pingpp") return "pingpp";
  return "xorpay";
}

/** 当前生效的在线支付配置（来自环境变量，换个体户/企业时改 env 即可） */
export function getOnlinePaymentConfig(): PaymentConfig | null {
  const provider = parseProvider(process.env.PAY_PROVIDER);
  const merchantProfile = parseMerchantProfile(process.env.PAY_MERCHANT_PROFILE);
  const enabledFlag = process.env.PAY_ONLINE_ENABLED?.trim().toLowerCase();
  const disabled =
    enabledFlag === "0" || enabledFlag === "false" || enabledFlag === "off";

  if (provider === "xorpay") {
    const merchantId = process.env.XORPAY_AID?.trim() ?? "";
    const secret = process.env.XORPAY_APP_SECRET?.trim() ?? "";
    if (!merchantId || !secret) return null;
    return {
      provider: "xorpay",
      merchantProfile,
      merchantId,
      enabled: !disabled,
    };
  }

  return null;
}

export function getXorPayAppSecret(): string | null {
  return process.env.XORPAY_APP_SECRET?.trim() || null;
}

export function getPublicSiteOrigin(fallback?: string): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (fromEnv) {
    return fromEnv.startsWith("http") ? fromEnv.replace(/\/$/, "") : `https://${fromEnv}`;
  }
  if (fallback) return fallback.replace(/\/$/, "");
  return "http://localhost:3003";
}

export const MERCHANT_PROFILE_LABEL: Record<MerchantProfile, string> = {
  personal: "个人",
  sole_trader: "个体户",
  enterprise: "企业",
};
