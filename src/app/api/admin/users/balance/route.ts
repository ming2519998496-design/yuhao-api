import { requireAdmin } from "@/lib/auth-admin";
import { setUserTotalBalance } from "@/lib/recharge";
import { NextRequest, NextResponse } from "next/server";

/** 管理员调整用户余额 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { userId?: string; balance?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const balance = Number(body.balance);

  if (!userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  }
  if (!Number.isFinite(balance) || balance < 0) {
    return NextResponse.json({ error: "余额不能为负数" }, { status: 400 });
  }

  try {
    const newBalance = await setUserTotalBalance(userId, balance);
    return NextResponse.json({
      ok: true,
      message: `余额已调整为 ¥${newBalance.toFixed(2)}`,
      balance: Number(newBalance.toFixed(2)),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "调整失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
