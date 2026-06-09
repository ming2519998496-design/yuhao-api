import { requireAdmin } from "@/lib/auth-admin";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("usage_logs")
    .select(
      "id, model, prompt_tokens, completion_tokens, total_tokens, cost, success, created_at, user_id, api_key_id"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((data ?? []).map((r) => r.user_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email")
    .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const emailMap = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  const logs = (data ?? []).map((row) => ({
    ...row,
    userEmail: emailMap.get(row.user_id) ?? "—",
  }));

  return NextResponse.json({ logs });
}
