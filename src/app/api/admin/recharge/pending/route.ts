import { requireAdmin } from "@/lib/auth-admin";
import { mapRechargeRecord } from "@/lib/recharge-records";
import { listAdminRechargeRecords } from "@/lib/recharge-records-db";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/** 待确认充值列表 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const { rows, error } = await listAdminRechargeRecords(admin, {
    status: "pending",
    limit: 100,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email")
    .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const emailMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.email ?? ""])
  );

  const records = rows.map((r) => {
    const mapped = mapRechargeRecord(r);
    return {
      id: mapped.id,
      orderNo: mapped.orderNo,
      amount: mapped.amount,
      method: mapped.method,
      email: emailMap.get(r.user_id) ?? "",
      createdAt: mapped.createdAt,
      proofUrl: mapped.proofUrl,
    };
  });

  return NextResponse.json({ records });
}
