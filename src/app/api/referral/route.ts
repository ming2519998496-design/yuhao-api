import { requireActiveUserResponse } from "@/lib/session-api";
import { getReferralStats } from "@/lib/referral";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await requireActiveUserResponse();
  if (auth.response) return auth.response;
  const user = auth.user;

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
