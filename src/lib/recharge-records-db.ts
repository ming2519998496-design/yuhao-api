import {
  generateRechargeOrderNo,
  isMissingCompletedAtColumn,
  isMissingOnlinePaymentColumns,
  isMissingOrderNoColumn,
  isMissingProofUrlColumn,
  mapRechargeRecord,
  orderNoFromId,
  RECHARGE_SELECT_USER_FULL,
  RECHARGE_SELECT_USER_LEGACY,
  RECHARGE_SELECT_FULL,
  RECHARGE_SELECT_LEGACY,
} from "@/lib/recharge-records";
import type { MerchantProfile, PayProviderId } from "@/lib/payment/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const ONLINE_ORDER_TTL_MINUTES = 30;

type RechargeInsertRow = {
  id: number;
  order_no?: string | null;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
};

/** 创建待确认充值记录（须含转账凭证 URL） */
export async function createPendingRechargeRecord(
  admin: SupabaseClient,
  params: { userId: string; amount: number; method: string; proofUrl: string }
): Promise<{ record: ReturnType<typeof mapRechargeRecord> | null; error: string | null }> {
  const base = {
    user_id: params.userId,
    amount: params.amount,
    method: params.method,
    status: "pending" as const,
    proof_url: params.proofUrl,
    source: "manual" as const,
  };

  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNo = generateRechargeOrderNo();
    const withOrder = await admin
      .from("recharge_records")
      .insert({ ...base, order_no: orderNo })
      .select(RECHARGE_SELECT_USER_FULL)
      .single();

    if (!withOrder.error && withOrder.data) {
      return { record: mapRechargeRecord(withOrder.data), error: null };
    }

    if (
      withOrder.error &&
      isMissingOnlinePaymentColumns(withOrder.error.message)
    ) {
      const legacyInsert = await admin
        .from("recharge_records")
        .insert({
          user_id: params.userId,
          amount: params.amount,
          method: params.method,
          status: "pending",
          proof_url: params.proofUrl,
          order_no: orderNo,
        })
        .select(RECHARGE_SELECT_USER_FULL)
        .single();
      if (!legacyInsert.error && legacyInsert.data) {
        return { record: mapRechargeRecord(legacyInsert.data), error: null };
      }
      if (legacyInsert.error) {
        return { record: null, error: legacyInsert.error.message };
      }
    }

    if (
      withOrder.error &&
      isMissingOrderNoColumn(withOrder.error.message)
    ) {
      return {
        record: null,
        error:
          "数据库缺少 order_no 字段，请在 Supabase SQL Editor 执行 supabase-recharge-setup.sql",
      };
    }

    if (
      withOrder.error &&
      isMissingProofUrlColumn(withOrder.error.message)
    ) {
      return {
        record: null,
        error:
          "数据库缺少 proof_url 字段，请在 Supabase SQL Editor 执行 supabase-recharge-proof.sql",
      };
    }

    if (
      withOrder.error &&
      !withOrder.error.message.includes("unique")
    ) {
      return { record: null, error: withOrder.error.message };
    }
  }

  return { record: null, error: "订单号生成失败，请重试" };
}

/** 创建在线支付 pending 订单（XorPay 等） */
export async function createOnlinePendingRechargeRecord(
  admin: SupabaseClient,
  params: {
    userId: string;
    amount: number;
    method: "alipay" | "wechat";
    payProvider: PayProviderId;
    merchantProfile: MerchantProfile;
    merchantId: string;
  }
): Promise<{ record: ReturnType<typeof mapRechargeRecord> | null; error: string | null }> {
  const expiredAt = new Date(
    Date.now() + ONLINE_ORDER_TTL_MINUTES * 60 * 1000
  ).toISOString();

  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNo = generateRechargeOrderNo();
    const insertPayload = {
      user_id: params.userId,
      order_no: orderNo,
      amount: params.amount,
      method: params.method,
      status: "pending" as const,
      source: "online" as const,
      pay_provider: params.payProvider,
      merchant_profile: params.merchantProfile,
      merchant_id: params.merchantId,
      expired_at: expiredAt,
      pay_meta: {},
    };

    const inserted = await admin
      .from("recharge_records")
      .insert(insertPayload)
      .select(RECHARGE_SELECT_USER_FULL)
      .single();

    if (!inserted.error && inserted.data) {
      return { record: mapRechargeRecord(inserted.data), error: null };
    }

    if (
      inserted.error &&
      isMissingOnlinePaymentColumns(inserted.error.message)
    ) {
      return {
        record: null,
        error:
          "数据库缺少在线支付字段，请在 Supabase SQL Editor 执行 supabase-recharge-online-payment.sql",
      };
    }

    if (
      inserted.error &&
      !inserted.error.message.includes("unique")
    ) {
      return { record: null, error: inserted.error.message };
    }
  }

  return { record: null, error: "订单号生成失败，请重试" };
}

export async function attachOnlinePaymentSession(
  admin: SupabaseClient,
  recordId: number,
  params: {
    externalOrderId?: string | null;
    payRedirectUrl: string;
    payMeta: Record<string, unknown>;
  }
) {
  return admin
    .from("recharge_records")
    .update({
      external_order_id: params.externalOrderId ?? null,
      pay_redirect_url: params.payRedirectUrl,
      pay_meta: params.payMeta,
    })
    .eq("id", recordId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
}

export async function getRechargeRecordByOrderNo(
  admin: SupabaseClient,
  orderNo: string
) {
  const full = await admin
    .from("recharge_records")
    .select(RECHARGE_SELECT_FULL)
    .eq("order_no", orderNo)
    .maybeSingle();

  if (!full.error) return full;

  if (
    isMissingOrderNoColumn(full.error.message) ||
    isMissingOnlinePaymentColumns(full.error.message)
  ) {
    return admin
      .from("recharge_records")
      .select(RECHARGE_SELECT_LEGACY)
      .eq("order_no", orderNo)
      .maybeSingle();
  }

  return full;
}

export async function getRechargeRecordByExternalOrderId(
  admin: SupabaseClient,
  externalOrderId: string
) {
  return admin
    .from("recharge_records")
    .select(RECHARGE_SELECT_FULL)
    .eq("external_order_id", externalOrderId)
    .maybeSingle();
}

export async function incrementRechargeNotifyCount(
  admin: SupabaseClient,
  recordId: number,
  currentCount: number
) {
  return admin
    .from("recharge_records")
    .update({ notify_count: currentCount + 1 })
    .eq("id", recordId);
}

export async function patchOnlinePaymentBeforeComplete(
  admin: SupabaseClient,
  recordId: number,
  params: {
    externalOrderId?: string;
    externalTradeId?: string;
    paidAmount: number;
  }
) {
  const payload: Record<string, unknown> = {
    paid_amount: params.paidAmount,
  };
  if (params.externalOrderId) payload.external_order_id = params.externalOrderId;
  if (params.externalTradeId) payload.external_trade_id = params.externalTradeId;

  return admin.from("recharge_records").update(payload).eq("id", recordId);
}

export async function markRechargeExpired(
  admin: SupabaseClient,
  recordId: number
) {
  return admin
    .from("recharge_records")
    .update({ status: "expired" })
    .eq("id", recordId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
}

/** 查询充值记录（兼容未迁移 order_no / completed_at 字段） */
export async function listUserRechargeRecords(
  admin: SupabaseClient,
  userId: string,
  limit = 50
) {
  const full = await admin
    .from("recharge_records")
    .select(RECHARGE_SELECT_USER_FULL)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!full.error) {
    return { records: (full.data ?? []).map(mapRechargeRecord), error: null };
  }

  if (
    isMissingOrderNoColumn(full.error.message) ||
    isMissingCompletedAtColumn(full.error.message) ||
    isMissingProofUrlColumn(full.error.message) ||
    isMissingOnlinePaymentColumns(full.error.message)
  ) {
    const legacy = await admin
      .from("recharge_records")
      .select(RECHARGE_SELECT_USER_LEGACY)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (legacy.error) {
      return { records: [], error: legacy.error.message };
    }

    return {
      records: (legacy.data ?? []).map((r) =>
        mapRechargeRecord({ ...r, completed_at: null, proof_url: null })
      ),
      error: null,
    };
  }

  return { records: [], error: full.error.message };
}

/** 管理员确认时写入 completed_at，可选修正实际到账金额 */
export async function markRechargeCompleted(
  admin: SupabaseClient,
  recordId: number,
  confirmedAmount?: number
) {
  const now = new Date().toISOString();
  const updatePayload: {
    status: string;
    completed_at: string;
    amount?: number;
  } = {
    status: "completed",
    completed_at: now,
  };
  if (confirmedAmount !== undefined) {
    updatePayload.amount = confirmedAmount;
  }

  const withTime = await admin
    .from("recharge_records")
    .update(updatePayload)
    .eq("id", recordId)
    .eq("status", "pending")
    .select("id, user_id, amount")
    .maybeSingle();

  if (!withTime.error) return withTime;

  if (isMissingCompletedAtColumn(withTime.error.message)) {
    const legacyPayload: { status: string; amount?: number } = {
      status: "completed",
    };
    if (confirmedAmount !== undefined) {
      legacyPayload.amount = confirmedAmount;
    }
    return admin
      .from("recharge_records")
      .update(legacyPayload)
      .eq("id", recordId)
      .eq("status", "pending")
      .select("id, user_id, amount")
      .maybeSingle();
  }

  return withTime;
}

/** 管理端查询充值记录（兼容未迁移字段） */
export async function listAdminRechargeRecords(
  admin: SupabaseClient,
  options?: { status?: string; limit?: number }
) {
  const limit = options?.limit ?? 200;
  let query = admin
    .from("recharge_records")
    .select(RECHARGE_SELECT_FULL)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const full = await query;
  if (!full.error) {
    return { rows: full.data ?? [], error: null };
  }

  if (
    isMissingOrderNoColumn(full.error.message) ||
    isMissingCompletedAtColumn(full.error.message) ||
    isMissingProofUrlColumn(full.error.message) ||
    isMissingOnlinePaymentColumns(full.error.message)
  ) {
    let legacyQuery = admin
      .from("recharge_records")
      .select(RECHARGE_SELECT_LEGACY)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (options?.status && options.status !== "all") {
      legacyQuery = legacyQuery.eq("status", options.status);
    }

    const legacy = await legacyQuery;
    if (legacy.error) {
      return { rows: [], error: legacy.error.message };
    }
    return { rows: legacy.data ?? [], error: null };
  }

  return { rows: [], error: full.error.message };
}

/** 回滚 pending 状态（兼容无 completed_at 字段） */
export async function revertRechargeToPending(
  admin: SupabaseClient,
  recordId: number
) {
  const withTime = await admin
    .from("recharge_records")
    .update({ status: "pending", completed_at: null })
    .eq("id", recordId);

  if (!withTime.error) return withTime;
  if (isMissingCompletedAtColumn(withTime.error.message)) {
    return admin
      .from("recharge_records")
      .update({ status: "pending" })
      .eq("id", recordId);
  }
  return withTime;
}
