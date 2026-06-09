import { completeRechargeAndRewards } from "@/lib/referral";
import {
  getRechargeRecordByExternalOrderId,
  getRechargeRecordByOrderNo,
  incrementRechargeNotifyCount,
  patchOnlinePaymentBeforeComplete,
} from "@/lib/recharge-records-db";
import type { VerifiedNotifyData } from "@/lib/payment/types";
import { createAdminClient } from "@/lib/supabase-admin";

export type ProcessOnlineNotifyResult =
  | { ok: true; alreadyCompleted?: boolean; orderNo: string }
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

  const result = await completeRechargeAndRewards(row.id, paid);
  if (!result.ok) {
    return { ok: false, error: result.error ?? "入账失败", httpStatus: 500 };
  }

  return { ok: true, orderNo: verified.orderNo };
}
