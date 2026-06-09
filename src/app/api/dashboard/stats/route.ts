import { getSessionUser } from "@/lib/auth-admin";
import { createAdminClient } from "@/lib/supabase-admin";
import { getUserTotalBalance } from "@/lib/user-balance";
import { NextResponse } from "next/server";

const DAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/** 当前登录用户的数据看板统计 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const admin = createAdminClient();
  const userId = user.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [keysRes, profileBalance, usageTodayRes, usageWeekRes, recentRes] =
    await Promise.all([
    admin.from("api_keys").select("total_usage").eq("user_id", userId),
    getUserTotalBalance(userId),
    admin
      .from("usage_logs")
      .select("cost, total_tokens, model")
      .eq("user_id", userId)
      .gte("created_at", todayIso),
    admin
      .from("usage_logs")
      .select("cost, total_tokens, model, created_at")
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false }),
    admin
      .from("usage_logs")
      .select(
        "model, total_tokens, cost, success, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const usageToday = usageTodayRes.data ?? [];
  const usageWeek = usageWeekRes.data ?? [];

  const balance = profileBalance;
  const totalUsage =
    keysRes.data?.reduce((s, k) => s + Number(k.total_usage), 0) ?? 0;

  const todayRequests = usageToday.length;
  const todayTokens = usageToday.reduce(
    (s, r) => s + (r.total_tokens ?? 0),
    0
  );
  const todayCost = usageToday.reduce((s, r) => s + Number(r.cost), 0);

  const dayMap = new Map<string, { tokens: number; cost: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { tokens: 0, cost: 0 });
  }
  for (const row of usageWeek) {
    const key = row.created_at?.slice(0, 10);
    if (!key || !dayMap.has(key)) continue;
    const cur = dayMap.get(key)!;
    cur.tokens += row.total_tokens ?? 0;
    cur.cost += Number(row.cost);
  }

  const trend = Array.from(dayMap.entries()).map(([date, v]) => {
    const d = new Date(date + "T12:00:00");
    return {
      date,
      day: DAY_LABELS[d.getDay()],
      tokens: v.tokens,
      cost: Number(v.cost.toFixed(4)),
    };
  });

  const modelMap = new Map<string, number>();
  for (const row of usageWeek) {
    const m = row.model || "unknown";
    modelMap.set(m, (modelMap.get(m) ?? 0) + (row.total_tokens ?? 0));
  }
  const modelTotal = Array.from(modelMap.values()).reduce((a, b) => a + b, 0);
  const modelUsage = Array.from(modelMap.entries())
    .map(([name, tokens]) => ({
      name,
      tokens,
      percent: modelTotal > 0 ? Math.round((tokens / modelTotal) * 100) : 0,
    }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 6);

  const activeModels = modelMap.size;

  const recentRequests = (recentRes.data ?? []).map((row) => ({
    time: row.created_at
      ? new Date(row.created_at).toLocaleTimeString("zh-CN", {
          hour12: false,
        })
      : "—",
    model: row.model,
    tokens: row.total_tokens ?? 0,
    cost: Number(row.cost).toFixed(4),
    status: row.success ? "成功" : "失败",
  }));

  return NextResponse.json({
    balance: Number(balance.toFixed(2)),
    totalUsage: Number(totalUsage.toFixed(4)),
    todayRequests,
    todayTokens,
    todayCost: Number(todayCost.toFixed(4)),
    activeModels,
    trend,
    modelUsage,
    recentRequests,
  });
}
