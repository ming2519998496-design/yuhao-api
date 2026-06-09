import { requireAdmin } from "@/lib/auth-admin";
import { mapRechargeRecord } from "@/lib/recharge-records";
import { listAdminRechargeRecords } from "@/lib/recharge-records-db";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

/** 管理后台：充值订单列表 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.trim() ?? "all";
  const q = searchParams.get("q")?.trim().toLowerCase();

  const admin = createAdminClient();
  const { rows, error } = await listAdminRechargeRecords(admin, {
    status,
    limit: 200,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      { email: p.email ?? "", fullName: p.full_name ?? "" },
    ])
  );

  let orders = rows.map((r) => {
    const profile = profileMap.get(r.user_id);
    return {
      ...mapRechargeRecord(r),
      email: profile?.email ?? "",
      fullName: profile?.fullName ?? "",
    };
  });

  if (q) {
    orders = orders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.fullName.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ orders });
}
