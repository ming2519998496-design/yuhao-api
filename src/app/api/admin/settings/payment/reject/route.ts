import { requireAdmin } from "@/lib/auth-admin";
import {
  clearPaymentPending,
  loadPaymentPending,
} from "@/lib/platform-settings-store";
import { NextResponse } from "next/server";

export async function POST() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const pending = await loadPaymentPending();
  if (!pending) {
    return NextResponse.json({ error: "没有待驳回的变更" }, { status: 400 });
  }

  await clearPaymentPending();

  return NextResponse.json({
    success: true,
    message:
      auth.user!.id === pending.proposedBy
        ? "已撤回您的收款码变更申请"
        : "已驳回收款码变更，用户端仍显示原收款码",
  });
}
