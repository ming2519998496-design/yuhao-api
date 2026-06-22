import { requireActiveUserResponse } from "@/lib/session-api";
import {
  getRechargeRecordByOrderNo,
  markRechargeExpired,
} from "@/lib/recharge-records-db";
import { mapRechargeRecord } from "@/lib/recharge-records";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

/** 查询在线订单状态（前端轮询） */
export async function GET(request: NextRequest) {
  const auth = await requireActiveUserResponse();
  if (auth.response) return auth.response;
  const user = auth.user;

  const orderNo = request.nextUrl.searchParams.get("orderNo")?.trim();
  if (!orderNo) {
    return NextResponse.json({ error: "缺少 orderNo" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await getRechargeRecordByOrderNo(admin, orderNo);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.user_id !== user.id) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  const record = mapRechargeRecord(data);

  if (
    record.status === "pending" &&
    record.source === "online" &&
    record.expiredAt &&
    new Date(record.expiredAt).getTime() < Date.now()
  ) {
    await markRechargeExpired(admin, record.id);
    record.status = "expired";
    record.statusLabel = "已过期";
  }

  return NextResponse.json({ record });
}
