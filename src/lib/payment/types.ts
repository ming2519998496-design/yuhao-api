/** 支付服务商（换个体户/企业时通常仍用同一 provider，仅 merchant 配置变） */
export type PayProviderId = "xorpay" | "pingpp" | "manual";

/** 进件主体：个人 → 个体户 → 企业 */
export type MerchantProfile = "personal" | "sole_trader" | "enterprise";

export type RechargeSource = "manual" | "online";

export type OnlinePayMethod = "alipay" | "wechat";

export type PaymentConfig = {
  provider: PayProviderId;
  merchantProfile: MerchantProfile;
  /** 平台侧商户/App ID，写入订单快照 */
  merchantId: string;
  enabled: boolean;
};

export type CreateOnlinePaymentInput = {
  orderNo: string;
  amountYuan: number;
  method: OnlinePayMethod;
  notifyUrl: string;
  orderUid?: string;
  productName?: string;
};

export type CreateOnlinePaymentResult = {
  ok: true;
  payRedirectUrl: string;
  providerPayload: Record<string, unknown>;
};

export type OnlinePaymentProvider = {
  id: PayProviderId;
  createPayment(input: CreateOnlinePaymentInput): Promise<
    CreateOnlinePaymentResult | { ok: false; error: string }
  >;
  verifyNotify(
    payload: Record<string, string>,
    secret: string
  ): { ok: true; data: VerifiedNotifyData } | { ok: false; error: string };
};

export type VerifiedNotifyData = {
  externalOrderId: string;
  orderNo: string;
  paidAmountYuan: number;
  paidAt: string;
  externalTradeId?: string;
  raw: Record<string, string>;
};
