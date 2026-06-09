import { requireAdmin } from "@/lib/auth-admin";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/** 全站充值记录（最近 100 条） */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("recharge_records")
    .select("id, user_id, amount, method, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((data ?? []).map((r) => r.user_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email")
    .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const emailMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.email ?? ""])
  );

  const records = (data ?? []).map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    method: r.method as string,
    status: r.status as string,
    email: emailMap.get(r.user_id) ?? "",
    createdAt: r.created_at,
  }));

  return NextResponse.json({ records });
}
