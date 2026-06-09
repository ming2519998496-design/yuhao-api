import { getOnlinePaymentConfig, getXorPayAppSecret } from "@/lib/payment/config";
import { createXorPayProvider } from "@/lib/payment/xorpay";
import type { OnlinePaymentProvider } from "@/lib/payment/types";

export function getOnlinePaymentProvider():
  | { provider: OnlinePaymentProvider; config: NonNullable<ReturnType<typeof getOnlinePaymentConfig>> }
  | { error: string } {
  const config = getOnlinePaymentConfig();
  if (!config) {
    return {
      error:
        "未配置在线支付（需 XORPAY_AID、XORPAY_APP_SECRET，可选 PAY_MERCHANT_PROFILE=personal）",
    };
  }
  if (!config.enabled) {
    return { error: "在线支付未开启（PAY_ONLINE_ENABLED=false）" };
  }

  const secret = getXorPayAppSecret();
  if (!secret) {
    return { error: "未配置 XORPAY_APP_SECRET" };
  }

  if (config.provider === "xorpay") {
    return {
      provider: createXorPayProvider(config.merchantId, secret),
      config,
    };
  }

  return { error: `暂不支持的支付服务商: ${config.provider}` };
}
