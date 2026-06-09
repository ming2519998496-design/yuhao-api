import { countAdminProfiles, requireAdmin } from "@/lib/auth-admin";
import { getAdminEmailList } from "@/lib/admin-policy";
import {
  getQrImageChangeChannels,
  requiresDualQrApproval,
} from "@/lib/payment-approval";
import {
  clearPaymentPending,
  loadPaymentAccounts,
  loadPaymentPending,
  savePaymentAccounts,
  savePaymentPending,
} from "@/lib/platform-settings-store";
import {
  DEFAULT_PAYMENT_ACCOUNTS,
  mergePaymentAccounts,
  sanitizePaymentAccounts,
  type PaymentAccountsConfig,
} from "@/lib/payment-settings";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const [{ accounts, updatedAt, source }, pending, adminCount] =
      await Promise.all([
        loadPaymentAccounts(),
        loadPaymentPending(),
        countAdminProfiles(),
      ]);

    const configuredAdmins = getAdminEmailList().length;

    return NextResponse.json({
      accounts,
      updatedAt,
      source,
      pending,
      adminCount,
      configuredAdmins,
      canApprove: !!(
        pending &&
        auth.user!.id !== pending.proposedBy &&
        adminCount >= 2
      ),
      isProposer: pending?.proposedBy === auth.user!.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "读取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { accounts?: PaymentAccountsConfig };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求体" }, { status: 400 });
  }

  const accounts = sanitizePaymentAccounts(
    mergePaymentAccounts(body.accounts ?? DEFAULT_PAYMENT_ACCOUNTS)
  );

  try {
    const { accounts: live } = await loadPaymentAccounts();
    const adminCount = await countAdminProfiles();
    const configuredAdmins = getAdminEmailList().length;

    if (requiresDualQrApproval(live, accounts)) {
      if (configuredAdmins < 2) {
        return NextResponse.json(
          {
            error:
              "修改收款码图片需在 .env 中配置 2 个管理员邮箱（ADMIN_EMAILS），并由另一名管理员确认",
          },
          { status: 400 }
        );
      }
      if (adminCount < 2) {
        return NextResponse.json(
          {
            error:
              "当前仅有 1 位管理员已登录/激活。请由另一名管理员账户登录并完成确认后，才能变更收款码图片",
          },
          { status: 400 }
        );
      }

      const changedChannels = getQrImageChangeChannels(live, accounts);
      await savePaymentPending({
        accounts,
        proposedBy: auth.user!.id,
        proposedByEmail: auth.user!.email ?? "",
        proposedAt: new Date().toISOString(),
        changedChannels,
      });

      return NextResponse.json({
        success: true,
        status: "pending_approval",
        pending: true,
        changedChannels,
        message:
          "收款码图片变更已提交，需另一名管理员在「收款账户」页点击确认后才会对用户生效",
        accounts: live,
      });
    }

    const { source } = await savePaymentAccounts(accounts, auth.user!.id);
    await clearPaymentPending();

    return NextResponse.json({
      success: true,
      status: "applied",
      accounts,
      source,
      hint:
        source === "storage"
          ? "已保存到 Storage（数据库表未创建）。建议在 Supabase SQL Editor 中 Create a new snippet 并 Run supabase-admin-schema.sql（见 docs/supabase-sql-editor-only.md）。"
          : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
