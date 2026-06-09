import { requireAdmin } from "@/lib/auth-admin";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/** 管理员冻结 / 解冻用户（仅管理员，requireAdmin 校验） */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error === "无管理员权限" ? "仅管理员可冻结或解冻账号" : auth.error },
      { status: auth.status }
    );
  }

  let body: { userId?: string; frozen?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  const userId = body.userId?.trim();
  if (!userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  }
  if (typeof body.frozen !== "boolean") {
    return NextResponse.json({ error: "缺少 frozen 参数" }, { status: 400 });
  }

  if (userId === auth.user!.id) {
    return NextResponse.json({ error: "不能冻结自己的账号" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile, error: loadErr } = await admin
    .from("profiles")
    .select("id, email, role, is_frozen")
    .eq("id", userId)
    .maybeSingle();

  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }
  if (profile.role === "admin") {
    return NextResponse.json({ error: "不能冻结管理员账号" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("profiles")
    .update({
      is_frozen: body.frozen,
      frozen_at: body.frozen ? now : null,
      updated_at: now,
    })
    .eq("id", userId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    userId,
    isFrozen: body.frozen,
    message: body.frozen ? "账号已冻结" : "账号已解冻",
  });
}
