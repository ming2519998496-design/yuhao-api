import type { PaymentAccountsConfig, PaymentChannel } from "@/lib/payment-settings";
import { resolveQrCodeUrl } from "@/lib/payment-settings";

export const PAYMENT_PENDING_KEY = "payment_accounts_pending";

export type PaymentAccountsPending = {
  accounts: PaymentAccountsConfig;
  proposedBy: string;
  proposedByEmail: string;
  proposedAt: string;
  changedChannels: PaymentChannel[];
};

const CHANNELS: PaymentChannel[] = ["combined", "alipay", "wechat"];

/** 非首次的收款码图片变更（含更换、清空） */
export function getQrImageChangeChannels(
  oldConfig: PaymentAccountsConfig,
  newConfig: PaymentAccountsConfig
): PaymentChannel[] {
  const changed: PaymentChannel[] = [];
  for (const ch of CHANNELS) {
    const oldQr = resolveQrCodeUrl(oldConfig[ch]);
    const newQr = resolveQrCodeUrl(newConfig[ch]);
    if (oldQr === newQr) continue;
    // 首次上传：原先无图、现在有图 → 不需双管理员
    if (!oldQr && newQr) continue;
    changed.push(ch);
  }
  return changed;
}

export function requiresDualQrApproval(
  oldConfig: PaymentAccountsConfig,
  newConfig: PaymentAccountsConfig
): boolean {
  return getQrImageChangeChannels(oldConfig, newConfig).length > 0;
}
