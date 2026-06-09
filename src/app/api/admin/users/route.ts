import { requireAdmin } from "@/lib/auth-admin";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const admin = createAdminClient();

  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, email, full_name, role, created_at, balance, is_frozen")
    .order("created_at", { ascending: false });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { data: keys } = await admin
    .from("api_keys")
    .select("user_id, total_usage, is_active");

  const { data: usage } = await admin
    .from("usage_logs")
    .select("user_id, cost, total_tokens");

  const keyByUser = new Map<string, { usage: number; keyCount: number }>();
  for (const k of keys ?? []) {
    const cur = keyByUser.get(k.user_id) ?? { usage: 0, keyCount: 0 };
    cur.usage += Number(k.total_usage);
    cur.keyCount += 1;
    keyByUser.set(k.user_id, cur);
  }

  const usageByUser = new Map<string, { requests: number; tokens: number }>();
  for (const u of usage ?? []) {
    const cur = usageByUser.get(u.user_id) ?? { requests: 0, tokens: 0 };
    cur.requests += 1;
    cur.tokens += u.total_tokens ?? 0;
    usageByUser.set(u.user_id, cur);
  }

  let users = (profiles ?? []).map((p) => {
    const k = keyByUser.get(p.id);
    const u = usageByUser.get(p.id);
    return {
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      role: p.role,
      createdAt: p.created_at,
      keyCount: k?.keyCount ?? 0,
      balance: Number(p.balance ?? 0),
      isFrozen: p.is_frozen === true,
      totalUsage: k?.usage ?? 0,
      requestCount: u?.requests ?? 0,
      totalTokens: u?.tokens ?? 0,
    };
  });

  if (q) {
    users = users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.fullName?.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ users });
}
