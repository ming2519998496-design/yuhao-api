import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `yh_${crypto.randomBytes(24).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 12) + "...";
  return { raw, hash, prefix };
}

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: keys, error } = await admin
    .from("api_keys")
    .select("id, key_prefix, name, balance, total_usage, is_active, created_at, last_used_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = body.name || "默认密钥";

  const admin = createAdminClient();
  const { count } = await admin
    .from("api_keys")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (count && count >= 10) {
    return NextResponse.json({ error: "每个账户最多创建 10 个 API Key" }, { status: 400 });
  }

  const { raw, hash, prefix } = generateApiKey();

  const { error } = await admin.from("api_keys").insert({
    user_id: user.id,
    key_hash: hash,
    key_prefix: prefix,
    name,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    key: raw,
    message: "请立即保存此 Key，之后不再显示",
  });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("id");

  if (!keyId) {
    return NextResponse.json({ error: "缺少 Key ID" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("api_keys")
    .delete()
    .eq("id", keyId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
