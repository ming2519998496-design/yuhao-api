import { completeRechargeAndRewards } from "@/lib/referral";
import { computeOnlineCreditedBalance } from "@/lib/recharge-fees";
import { isOnlineOrderPastExpiry } from "@/lib/recharge-records";
import {
  getRechargeRecordByExternalOrderId,
  getRechargeRecordByOrderNo,
  incrementRechargeNotifyCount,
  markRechargeExpired,
  patchOnlinePaymentBeforeComplete,
  recordLatePaymentOnExpiredOrder,
} from "@/lib/recharge-records-db";
import type { VerifiedNotifyData } from "@/lib/payment/types";
import { createAdminClient } from "@/lib/supabase-admin";

export type ProcessOnlineNotifyResult =
  | {
      ok: true;
      alreadyCompleted?: boolean;
      latePayment?: boolean;
      orderNo: string;
    }
  | { ok: false; error: string; httpStatus?: number };

/** 支付回调验签通过后：幂等入账 + 邀请奖励 */
export async function processOnlinePaymentNotify(
  verified: VerifiedNotifyData
): Promise<ProcessOnlineNotifyResult> {
  const admin = createAdminClient();

  let row =
    (await getRechargeRecordByOrderNo(admin, verified.orderNo)).data ?? null;

  if (!row && verified.externalOrderId) {
    row =
      (await getRechargeRecordByExternalOrderId(admin, verified.externalOrderId))
        .data ?? null;
  }

  if (!row) {
    return { ok: false, error: "订单不存在", httpStatus: 404 };
  }

  const notifyCount =
    "notify_count" in row &&
    typeof (row as { notify_count?: number }).notify_count === "number"
      ? (row as { notify_count: number }).notify_count
      : 0;
  await incrementRechargeNotifyCount(admin, row.id, notifyCount);

  if (row.status === "completed") {
    return { ok: true, alreadyCompleted: true, orderNo: verified.orderNo };
  }

  const mapped = {
    status: row.status,
    source:
      "source" in row && row.source === "online" ? ("online" as const) : undefined,
    expiredAt:
      "expired_at" in row && typeof row.expired_at === "string"
        ? row.expired_at
        : null,
  };

  if (row.status === "pending" && isOnlineOrderPastExpiry(mapped)) {
    await markRechargeExpired(admin, row.id);
    row = { ...row, status: "expired" };
  }

  if (row.status === "expired") {
    const orderAmount = Number(row.amount);
    const paid = Number(verified.paidAmountYuan.toFixed(2));
    const existingPayMeta =
      "pay_meta" in row &&
      row.pay_meta &&
      typeof row.pay_meta === "object" &&
      !Array.isArray(row.pay_meta)
        ? (row.pay_meta as Record<string, unknown>)
        : {};

    await recordLatePaymentOnExpiredOrder(admin, row.id, {
      externalTradeId: verified.externalTradeId,
      paidAmount: paid,
      notifyPayload: verified as unknown as Record<string, unknown>,
      existingPayMeta,
    });

    console.warn(
      "[payment] late payment on expired order",
      verified.orderNo,
      `order ¥${orderAmount} paid ¥${paid} — manual review required`
    );

    return { ok: true, latePayment: true, orderNo: verified.orderNo };
  }

  if (row.status !== "pending") {
    return {
      ok: false,
      error: `订单状态不可入账: ${row.status}`,
      httpStatus: 400,
    };
  }

  const orderAmount = Number(row.amount);
  const paid = Number(verified.paidAmountYuan.toFixed(2));
  if (Math.abs(orderAmount - paid) > 0.001) {
    return {
      ok: false,
      error: `支付金额与订单不符（订单 ¥${orderAmount}，实付 ¥${paid}）`,
      httpStatus: 400,
    };
  }

  await patchOnlinePaymentBeforeComplete(admin, row.id, {
    externalOrderId: verified.externalOrderId,
    externalTradeId: verified.externalTradeId,
    paidAmount: paid,
  });

  const credited = computeOnlineCreditedBalance(paid);
  if (credited < 1) {
    return {
      ok: false,
      error: `到账金额 ¥${credited.toFixed(2)} 低于最低 ¥1（实付 ¥${paid.toFixed(2)}）`,
      httpStatus: 400,
    };
  }

  const result = await completeRechargeAndRewards(row.id, credited);
  if (!result.ok) {
    return { ok: false, error: result.error ?? "入账失败", httpStatus: 500 };
  }

  return { ok: true, orderNo: verified.orderNo };
}
