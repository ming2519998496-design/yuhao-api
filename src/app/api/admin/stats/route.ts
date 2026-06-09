import { requireAdmin } from "@/lib/auth-admin";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString();

  const [
    usersRes,
    keysRes,
    usageTodayRes,
    usageAllRes,
    balanceRes,
    adjustmentsTodayRes,
    adjustmentsWeekRes,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("api_keys").select("id", { count: "exact", head: true }),
    admin
      .from("usage_logs")
      .select("cost, total_tokens")
      .gte("created_at", todayIso),
    admin
      .from("usage_logs")
      .select("cost, total_tokens, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    admin.from("profiles").select("balance"),
    admin
      .from("balance_adjustment_logs")
      .select("delta")
      .gte("created_at", todayIso),
    admin
      .from("balance_adjustment_logs")
      .select("delta, created_at")
      .gte("created_at", sevenDaysAgoIso),
  ]);

  const usageToday = usageTodayRes.data ?? [];
  const usageAll = usageAllRes.data ?? [];
  const adjustmentsToday = adjustmentsTodayRes.data ?? [];
  const adjustmentsWeek = adjustmentsWeekRes.data ?? [];

  const todayUsageCost = usageToday.reduce((s, r) => s + Number(r.cost), 0);
  const todayAdjustmentIncome = adjustmentsToday.reduce(
    (s, r) => s + Number(r.delta),
    0
  );
  const todayCost = todayUsageCost + todayAdjustmentIncome;
  const todayTokens = usageToday.reduce((s, r) => s + (r.total_tokens ?? 0), 0);
  const totalCost = usageAll.reduce((s, r) => s + Number(r.cost), 0);
  const totalBalance =
    balanceRes.data?.reduce((s, r) => s + Number(r.balance), 0) ?? 0;

  // 近 7 日趋势
  const dayMap = new Map<string, { tokens: number; cost: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { tokens: 0, cost: 0 });
  }
  for (const row of usageAll) {
    const key = row.created_at?.slice(0, 10);
    if (!key || !dayMap.has(key)) continue;
    const cur = dayMap.get(key)!;
    cur.tokens += row.total_tokens ?? 0;
    cur.cost += Number(row.cost);
  }
  for (const row of adjustmentsWeek) {
    const key = row.created_at?.slice(0, 10);
    if (!key || !dayMap.has(key)) continue;
    dayMap.get(key)!.cost += Number(row.delta);
  }

  return NextResponse.json({
    userCount: usersRes.count ?? 0,
    keyCount: keysRes.count ?? 0,
    todayRequests: usageToday.length,
    todayTokens,
    todayCost,
    totalCost,
    totalBalance,
    trend: Array.from(dayMap.entries()).map(([date, v]) => ({
      date,
      tokens: Math.round(v.tokens / 1000),
      cost: Number(v.cost.toFixed(4)),
    })),
  });
}
