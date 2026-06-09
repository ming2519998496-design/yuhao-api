import { requireAdmin } from "@/lib/auth-admin";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/** 清零余额与调用记录（保留用户与 API Key） */
export async function POST() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();

  const { error: usageError, count: usageDeleted } = await admin
    .from("usage_logs")
    .delete({ count: "exact" })
    .gte("id", 0);

  if (usageError) {
    return NextResponse.json({ error: usageError.message }, { status: 500 });
  }

  const { data: keys, error: keysFetchError } = await admin
    .from("api_keys")
    .select("id");

  if (keysFetchError) {
    return NextResponse.json({ error: keysFetchError.message }, { status: 500 });
  }

  let keysReset = 0;
  if (keys?.length) {
    const { error: keysError } = await admin
      .from("api_keys")
      .update({
        balance: 0,
        total_usage: 0,
        last_used_at: null,
      })
      .in(
        "id",
        keys.map((k) => k.id)
      );

    if (keysError) {
      return NextResponse.json({ error: keysError.message }, { status: 500 });
    }
    keysReset = keys.length;
  }

  return NextResponse.json({
    ok: true,
    message: "已清零：调用记录已删除，所有 API Key 余额与累计消费已归零",
    usageLogsDeleted: usageDeleted ?? 0,
    apiKeysReset: keysReset,
  });
}
