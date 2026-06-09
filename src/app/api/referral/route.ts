import { getSessionUser } from "@/lib/auth-admin";
import { getReferralStats } from "@/lib/referral";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const stats = await getReferralStats(user.id);
    const origin = new URL(request.url).origin;
    const inviteLink = `${origin}/register?aff=${stats.affCode}`;

    return NextResponse.json({ ...stats, inviteLink });
  } catch (e) {
    const message = e instanceof Error ? e.message : "加载失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
