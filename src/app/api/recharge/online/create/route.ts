import { getSessionUser } from "@/lib/auth-admin";
import { getPublicSiteOrigin } from "@/lib/payment/config";
import { getOnlinePaymentProvider } from "@/lib/payment/provider";
import type { OnlinePayMethod } from "@/lib/payment/types";
import {
  computeOnlineCreditedBalance,
  getOnlineMinPayYuan,
  isValidOnlinePayAmount,
  ONLINE_RECHARGE_FEE_PERCENT_LABEL,
  ONLINE_RECHARGE_MIN_PAY_YUAN,
} from "@/lib/recharge-fees";
import {
  attachOnlinePaymentSession,
  createOnlinePendingRechargeRecord,
  markRechargeExpired,
} from "@/lib/recharge-records-db";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

const MAX_AMOUNT = 100_000;

/** 创建在线支付订单（XorPay 个人版起步，换主体仅改 env） */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { amount?: unknown; method?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const method = String(body.method ?? "") as OnlinePayMethod;

  if (!Number.isFinite(amount) || amount > MAX_AMOUNT) {
    return NextResponse.json(
      { error: `充值金额须在 ¥${ONLINE_RECHARGE_MIN_PAY_YUAN} ~ ¥${MAX_AMOUNT} 之间` },
      { status: 400 }
    );
  }
  if (amount < ONLINE_RECHARGE_MIN_PAY_YUAN || !isValidOnlinePayAmount(amount)) {
    return NextResponse.json(
      {
        error: `在线支付最低 ¥${ONLINE_RECHARGE_MIN_PAY_YUAN}（扣除 ${ONLINE_RECHARGE_FEE_PERCENT_LABEL} 手续费后预计到账 ¥${computeOnlineCreditedBalance(ONLINE_RECHARGE_MIN_PAY_YUAN).toFixed(2)}）`,
      },
      { status: 400 }
    );
  }
  if (method !== "alipay" && method !== "wechat") {
    return NextResponse.json({ error: "method 须为 alipay 或 wechat" }, { status: 400 });
  }

  const payment = getOnlinePaymentProvider();
  if ("error" in payment) {
    return NextResponse.json({ error: payment.error }, { status: 503 });
  }

  const admin = createAdminClient();

  const { count: pendingCount } = await admin
    .from("recharge_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pending");

  if ((pendingCount ?? 0) > 0) {
    return NextResponse.json(
      { error: "您已有待支付的充值订单，请完成或等待过期后再试" },
      { status: 400 }
    );
  }

  const amountYuan = Number(amount.toFixed(2));
  const { record, error: createErr } = await createOnlinePendingRechargeRecord(
    admin,
    {
      userId: user.id,
      amount: amountYuan,
      method,
      payProvider: payment.config.provider,
      merchantProfile: payment.config.merchantProfile,
      merchantId: payment.config.merchantId,
    }
  );

  if (!record || createErr) {
    return NextResponse.json(
      {
        error: createErr ?? "创建订单失败",
        hint: createErr?.includes("在线支付字段")
          ? "请在 Supabase SQL Editor 执行 supabase-recharge-online-payment.sql"
          : undefined,
      },
      { status: 500 }
    );
  }

  const origin = getPublicSiteOrigin(new URL(request.url).origin);
  const notifyUrl = `${origin}/api/payment/notify/xorpay`;

  const created = await payment.provider.createPayment({
    orderNo: record.orderNo,
    amountYuan,
    method,
    notifyUrl,
    orderUid: user.id,
    productName: "遇好API 余额充值",
  });

  if (!created.ok) {
    await markRechargeExpired(admin, record.id);
    return NextResponse.json({ error: created.error }, { status: 502 });
  }

  const aoid =
    typeof created.providerPayload.aoid === "string"
      ? created.providerPayload.aoid
      : null;

  await attachOnlinePaymentSession(admin, record.id, {
    externalOrderId: aoid,
    payRedirectUrl: created.payRedirectUrl,
    payMeta: created.providerPayload,
  });

  return NextResponse.json({
    ok: true,
    orderNo: record.orderNo,
    amount: amountYuan,
    creditedPreview: computeOnlineCreditedBalance(amountYuan),
    method,
    payRedirectUrl: created.payRedirectUrl,
    expiredAt: record.expiredAt,
    merchantProfile: payment.config.merchantProfile,
    payProvider: payment.config.provider,
    record: {
      ...record,
      payRedirectUrl: created.payRedirectUrl,
      externalOrderId: aoid,
    },
  });
}
