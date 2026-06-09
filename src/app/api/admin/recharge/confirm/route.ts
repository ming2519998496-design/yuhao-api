import { requireAdmin } from "@/lib/auth-admin";
import { orderNoFromId } from "@/lib/recharge-records";
import { completeRechargeAndRewards } from "@/lib/referral";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

/** 管理员确认充值到账（给对应用户加余额并结算邀请奖励） */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { recordId?: number; amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  const recordId = Number(body.recordId);
  const confirmedAmount =
    body.amount !== undefined ? Number(body.amount) : undefined;

  if (!Number.isFinite(recordId)) {
    return NextResponse.json({ error: "缺少 recordId" }, { status: 400 });
  }

  const result = await completeRechargeAndRewards(recordId, confirmedAmount);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data: record } = await admin
    .from("recharge_records")
    .select("order_no")
    .eq("id", recordId)
    .maybeSingle();

  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", result.userId ?? "")
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    message: result.alreadyCompleted
      ? "该笔充值此前已确认到账"
      : `订单 ${record?.order_no ?? orderNoFromId(recordId)} 已确认，为用户 ${profile?.email ?? ""} 入账 ¥${result.amount?.toFixed(2)}，当前余额 ¥${result.newBalance?.toFixed(2)}`,
    orderNo: record?.order_no ?? orderNoFromId(recordId),
    userId: result.userId,
    email: profile?.email ?? "",
    amount: result.amount,
    newBalance: result.newBalance,
    alreadyCompleted: result.alreadyCompleted ?? false,
  });
}
