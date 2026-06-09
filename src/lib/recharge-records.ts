import type {
  MerchantProfile,
  PayProviderId,
  RechargeSource,
} from "@/lib/payment/types";

export const RECHARGE_STATUS_LABEL: Record<string, string> = {
  pending: "待到账",
  completed: "已到账",
  rejected: "已拒绝",
  expired: "已过期",
};

export const RECHARGE_SOURCE_LABEL: Record<RechargeSource, string> = {
  manual: "转账凭证",
  online: "在线支付",
};

/** 生成充值订单号：RC + 年月日时分秒 + 4 位随机数 */
export function generateRechargeOrderNo(): string {
  const d = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const stamp =
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `RC${stamp}${rand}`;
}

export type RechargeRecordRow = {
  id: number;
  orderNo: string;
  amount: number;
  method: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  completedAt: string | null;
  proofUrl: string | null;
  source: RechargeSource;
  payProvider: PayProviderId | null;
  merchantProfile: MerchantProfile | null;
  merchantId: string | null;
  externalOrderId: string | null;
  externalTradeId: string | null;
  paidAmount: number | null;
  payRedirectUrl: string | null;
  expiredAt: string | null;
};

export const RECHARGE_ONLINE_COLUMNS =
  "source, pay_provider, merchant_profile, merchant_id, external_order_id, external_trade_id, paid_amount, pay_redirect_url, expired_at, notify_count, pay_meta";

export const RECHARGE_SELECT_FULL =
  `id, order_no, user_id, amount, method, status, created_at, completed_at, proof_url, ${RECHARGE_ONLINE_COLUMNS}`;
export const RECHARGE_SELECT_LEGACY =
  "id, user_id, amount, method, status, created_at";
export const RECHARGE_SELECT_USER_FULL =
  `id, order_no, amount, method, status, created_at, completed_at, proof_url, ${RECHARGE_ONLINE_COLUMNS}`;
export const RECHARGE_SELECT_USER_LEGACY =
  "id, amount, method, status, created_at";

export function isMissingRechargeColumn(
  message: string,
  column: string
): boolean {
  const m = message.toLowerCase();
  const col = column.toLowerCase();
  return (
    m.includes(col) &&
    (m.includes("schema cache") ||
      m.includes("could not find") ||
      m.includes("column"))
  );
}

export function isMissingOrderNoColumn(message: string): boolean {
  return isMissingRechargeColumn(message, "order_no");
}

export function isMissingCompletedAtColumn(message: string): boolean {
  return isMissingRechargeColumn(message, "completed_at");
}

export function isMissingProofUrlColumn(message: string): boolean {
  return isMissingRechargeColumn(message, "proof_url");
}

export function isMissingOnlinePaymentColumns(message: string): boolean {
  return (
    isMissingRechargeColumn(message, "source") ||
    isMissingRechargeColumn(message, "pay_provider") ||
    isMissingRechargeColumn(message, "external_order_id")
  );
}

export function orderNoFromId(id: number): string {
  return `RC${String(id).padStart(12, "0")}`;
}

export function mapRechargeRecord(r: {
  id: number;
  order_no?: string | null;
  amount: number | string;
  method: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
  proof_url?: string | null;
  source?: string | null;
  pay_provider?: string | null;
  merchant_profile?: string | null;
  merchant_id?: string | null;
  external_order_id?: string | null;
  external_trade_id?: string | null;
  paid_amount?: number | string | null;
  pay_redirect_url?: string | null;
  expired_at?: string | null;
}): RechargeRecordRow {
  const source = (r.source === "online" ? "online" : "manual") as RechargeSource;
  return {
    id: r.id,
    orderNo: r.order_no ?? orderNoFromId(r.id),
    amount: Number(r.amount),
    method: r.method,
    status: r.status,
    statusLabel: RECHARGE_STATUS_LABEL[r.status] ?? r.status,
    createdAt: r.created_at,
    completedAt: r.completed_at ?? null,
    proofUrl: r.proof_url ?? null,
    source,
    payProvider: (r.pay_provider as PayProviderId | null) ?? null,
    merchantProfile: (r.merchant_profile as MerchantProfile | null) ?? null,
    merchantId: r.merchant_id ?? null,
    externalOrderId: r.external_order_id ?? null,
    externalTradeId: r.external_trade_id ?? null,
    paidAmount:
      r.paid_amount != null && r.paid_amount !== ""
        ? Number(r.paid_amount)
        : null,
    payRedirectUrl: r.pay_redirect_url ?? null,
    expiredAt: r.expired_at ?? null,
  };
}
