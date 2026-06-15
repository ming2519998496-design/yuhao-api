import { requireAdmin } from "@/lib/auth-admin";
import { fetchAllUpstreamBalances } from "@/lib/upstream-balance";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 查询各上游厂商余额 / Key 状态（管理员） */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const balances = await fetchAllUpstreamBalances();
    return NextResponse.json({
      balances,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "查询失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
