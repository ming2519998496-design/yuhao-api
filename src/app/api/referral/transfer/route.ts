import { getSessionUser } from "@/lib/auth-admin";
import { transferReferralToBalance } from "@/lib/referral";
import { NextResponse } from "next/server";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const result = await transferReferralToBalance(user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: `已划转 ¥${result.amount?.toFixed(2)} 到账户余额`,
    amount: result.amount,
  });
}
