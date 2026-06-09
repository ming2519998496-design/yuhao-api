import { countAdminProfiles, requireAdmin } from "@/lib/auth-admin";
import {
  clearPaymentPending,
  loadPaymentPending,
  savePaymentAccounts,
} from "@/lib/platform-settings-store";
import { NextResponse } from "next/server";

export async function POST() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const pending = await loadPaymentPending();
  if (!pending) {
    return NextResponse.json({ error: "没有待确认的收款码变更" }, { status: 400 });
  }

  if (pending.proposedBy === auth.user!.id) {
    return NextResponse.json(
      { error: "不能确认自己提交的变更，需另一名管理员操作" },
      { status: 403 }
    );
  }

  const adminCount = await countAdminProfiles();
  if (adminCount < 2) {
    return NextResponse.json(
      { error: "需要 2 名管理员均可用后才能确认" },
      { status: 400 }
    );
  }

  try {
    const { source } = await savePaymentAccounts(
      pending.accounts,
      auth.user!.id
    );
    await clearPaymentPending();

    return NextResponse.json({
      success: true,
      status: "applied",
      accounts: pending.accounts,
      source,
      message: "已确认，用户充值页将显示最新收款码",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "确认失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
