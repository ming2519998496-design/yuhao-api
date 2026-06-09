import {
  getOnlinePaymentConfig,
  MERCHANT_PROFILE_LABEL,
} from "@/lib/payment/config";
import { NextResponse } from "next/server";

/** 前端判断在线支付是否可用（不暴露密钥） */
export async function GET() {
  const config = getOnlinePaymentConfig();
  if (!config || !config.enabled) {
    return NextResponse.json({
      enabled: false,
      reason: config
        ? "在线支付未开启"
        : "未配置在线支付（XorPay AID / Secret）",
    });
  }

  return NextResponse.json({
    enabled: true,
    provider: config.provider,
    merchantProfile: config.merchantProfile,
    merchantProfileLabel: MERCHANT_PROFILE_LABEL[config.merchantProfile],
  });
}
