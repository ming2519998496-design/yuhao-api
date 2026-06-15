/** 在线充值通道手续费（向用户收取） */
export const ONLINE_RECHARGE_FEE_RATE = 0.018;

export const ONLINE_RECHARGE_FEE_PERCENT_LABEL = "1.8%";

/** 在线支付说明（我的钱包 · 回调充值） */
export const ONLINE_RECHARGE_FEE_NOTICE =
  "充值手续费1.8%/笔，即时到账。例充值50元，实际余额到账49.10元";

export const ONLINE_RECHARGE_FEE_DISCLOSURE =
  "充值手续费 1.8%/笔，付款成功后即时到账。";

export const ONLINE_RECHARGE_FEE_EXAMPLE =
  "例：充值 50 元，实际余额到账 49.10 元";

/** 人工充值说明（我的钱包 · 人工充值） */
export const MANUAL_RECHARGE_DELAY_NOTICE =
  "余额到账会有延迟，请刷新页面";

export const MANUAL_RECHARGE_EXTRA_NOTICE =
  "无手续费，单笔最低 ¥5；需上传转账凭证，实际转账金额即为到账余额，由管理员核对凭证后入账。";

/** 充值最低金额（元）：在线实付、人工到账均不低于此值 */
export const RECHARGE_MIN_YUAN = 5;

export const ONLINE_RECHARGE_MIN_PAY_YUAN = RECHARGE_MIN_YUAN;
export const MANUAL_RECHARGE_MIN_PAY_YUAN = RECHARGE_MIN_YUAN;

/** 在线支付后计入余额的金额（扣除通道费） */
export function computeOnlineCreditedBalance(paidYuan: number): number {
  const paid = Number(Number(paidYuan).toFixed(2));
  if (!Number.isFinite(paid) || paid <= 0) return 0;
  return Number((paid * (1 - ONLINE_RECHARGE_FEE_RATE)).toFixed(2));
}

export function getOnlineMinPayYuan(): number {
  return ONLINE_RECHARGE_MIN_PAY_YUAN;
}

export function isValidOnlinePayAmount(paidYuan: number): boolean {
  const paid = Number(Number(paidYuan).toFixed(2));
  return Number.isFinite(paid) && paid >= ONLINE_RECHARGE_MIN_PAY_YUAN;
}

export function formatOnlineRechargePreview(paidYuan: number): string {
  const credited = computeOnlineCreditedBalance(paidYuan);
  return `支付 ¥${paidYuan.toFixed(2)}，预计到账 ¥${credited.toFixed(2)}`;
}
