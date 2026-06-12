import { requireAdmin } from "@/lib/auth-admin";
import {
  isAdminAdjustmentKind,
  rechargeEffectiveAt,
} from "@/lib/balance-adjustment-log";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

function startOfTodayIso(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

function isOnOrAfterDay(iso: string | null, dayStartIso: string): boolean {
  if (!iso) return false;
  return iso >= dayStartIso;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const todayIso = startOfTodayIso();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString();

  const [
    usersRes,
    keysRes,
    usageTodayRes,
    usageWeekRes,
    balanceRes,
    adjustmentsWeekRes,
    rechargesWeekRes,
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
      .gte("created_at", sevenDaysAgoIso)
      .order("created_at", { ascending: false }),
    admin.from("profiles").select("balance"),
    admin
      .from("balance_adjustment_logs")
      .select("delta, kind, created_at")
      .gte("created_at", sevenDaysAgoIso),
    admin
      .from("recharge_records")
      .select("amount, created_at, completed_at")
      .eq("status", "completed")
      .or(
        `completed_at.gte.${sevenDaysAgoIso},and(completed_at.is.null,created_at.gte.${sevenDaysAgoIso})`
      ),
  ]);

  const usageToday = usageTodayRes.data ?? [];
  const usageWeek = usageWeekRes.data ?? [];
  const adjustmentsWeek = adjustmentsWeekRes.data ?? [];
  const rechargesWeek = rechargesWeekRes.data ?? [];

  const todayApiIncome = usageToday.reduce((s, r) => s + Number(r.cost), 0);
  const todayTokens = usageToday.reduce((s, r) => s + (r.total_tokens ?? 0), 0);

  const todayRecharge = rechargesWeek
    .filter((row) => isOnOrAfterDay(rechargeEffectiveAt(row), todayIso))
    .reduce((s, r) => s + Number(r.amount), 0);

  const todayAdminAdjustment = adjustmentsWeek
    .filter(
      (row) =>
        isAdminAdjustmentKind(
          (row as { kind?: string | null }).kind ?? null
        ) && isOnOrAfterDay(row.created_at, todayIso)
    )
    .reduce((s, r) => s + Number(r.delta), 0);

  const totalApiCost = usageWeek.reduce((s, r) => s + Number(r.cost), 0);
  const totalBalance =
    balanceRes.data?.reduce((s, r) => s + Number(r.balance), 0) ?? 0;

  const dayMap = new Map<
    string,
    { tokens: number; apiIncome: number; recharge: number; adminAdjustment: number }
  >();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, {
      tokens: 0,
      apiIncome: 0,
      recharge: 0,
      adminAdjustment: 0,
    });
  }

  for (const row of usageWeek) {
    const key = row.created_at?.slice(0, 10);
    if (!key || !dayMap.has(key)) continue;
    const cur = dayMap.get(key)!;
    cur.tokens += row.total_tokens ?? 0;
    cur.apiIncome += Number(row.cost);
  }

  for (const row of rechargesWeek) {
    const effective = rechargeEffectiveAt(row);
    const key = effective?.slice(0, 10);
    if (!key || !dayMap.has(key)) continue;
    dayMap.get(key)!.recharge += Number(row.amount);
  }

  for (const row of adjustmentsWeek) {
    if (!isAdminAdjustmentKind((row as { kind?: string | null }).kind ?? null)) {
      continue;
    }
    const key = row.created_at?.slice(0, 10);
    if (!key || !dayMap.has(key)) continue;
    dayMap.get(key)!.adminAdjustment += Number(row.delta);
  }

  return NextResponse.json({
    userCount: usersRes.count ?? 0,
    keyCount: keysRes.count ?? 0,
    todayRequests: usageToday.length,
    todayTokens,
    todayApiIncome: Number(todayApiIncome.toFixed(4)),
    todayRecharge: Number(todayRecharge.toFixed(4)),
    todayAdminAdjustment: Number(todayAdminAdjustment.toFixed(4)),
    /** @deprecated 使用拆分字段 todayApiIncome / todayRecharge / todayAdminAdjustment */
    todayCost: Number(
      (todayApiIncome + todayRecharge + todayAdminAdjustment).toFixed(4)
    ),
    totalCost: Number(totalApiCost.toFixed(4)),
    totalBalance,
    trend: Array.from(dayMap.entries()).map(([date, v]) => ({
      date,
      tokens: Math.round(v.tokens / 1000),
      apiIncome: Number(v.apiIncome.toFixed(4)),
      recharge: Number(v.recharge.toFixed(4)),
      adminAdjustment: Number(v.adminAdjustment.toFixed(4)),
      /** @deprecated */
      cost: Number((v.apiIncome + v.recharge + v.adminAdjustment).toFixed(4)),
    })),
  });
}
