import { loadPaymentAccountsForDisplay } from "@/lib/platform-settings-store";
import { toPublicPaymentConfig } from "@/lib/payment-settings";
import { NextResponse } from "next/server";

/** 用户充值页读取收款账户（公开接口，含 Storage 备选收款码） */
export async function GET() {
  try {
    const { primary, backup } = await loadPaymentAccountsForDisplay();
    return NextResponse.json({
      accounts: toPublicPaymentConfig(primary, backup),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "读取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
