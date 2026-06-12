import { createAdminClient } from "@/lib/supabase-admin";

export type BalanceAdjustmentKind = "admin" | "recharge";

function isMissingKindColumn(message: string): boolean {
  return /kind|column.*does not exist/i.test(message);
}

/** 写入余额变动日志（管理员调整或充值到账） */
export async function logBalanceAdjustment(params: {
  userId: string;
  previousBalance: number;
  newBalance: number;
  kind: BalanceAdjustmentKind;
  rechargeRecordId?: number;
}): Promise<void> {
  const delta = Number((params.newBalance - params.previousBalance).toFixed(4));
  if (delta === 0) return;

  const admin = createAdminClient();
  const base = {
    user_id: params.userId,
    previous_balance: params.previousBalance,
    new_balance: params.newBalance,
    delta,
  };

  const withKind: Record<string, unknown> = {
    ...base,
    kind: params.kind,
  };
  if (params.rechargeRecordId != null) {
    withKind.recharge_record_id = params.rechargeRecordId;
  }

  let { error } = await admin.from("balance_adjustment_logs").insert(withKind);
  if (error && isMissingKindColumn(error.message)) {
    ({ error } = await admin.from("balance_adjustment_logs").insert(base));
  }

  if (error) {
    throw new Error(`余额变动日志写入失败: ${error.message}`);
  }
}

export function isAdminAdjustmentKind(kind: string | null | undefined): boolean {
  return !kind || kind === "admin";
}

export function rechargeEffectiveAt(row: {
  completed_at?: string | null;
  created_at?: string | null;
}): string | null {
  return row.completed_at ?? row.created_at ?? null;
}
