import { calculateUsageCost, type ModelPricing } from "@/lib/models";
import type { createAdminClient } from "@/lib/supabase-admin";

export const DEFAULT_MAX_COMPLETION_TOKENS = 4096;
export const MAX_RESERVE_COMPLETION_TOKENS = 8192;

export type TokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
};

export class BillingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingError";
  }

  isInsufficientBalance(): boolean {
    return this.message.toLowerCase().includes("insufficient balance");
  }
}

/** 从 messages 粗估 prompt tokens（字符数 / 4，至少 100） */
export function estimatePromptTokens(messages: unknown): number {
  const text = JSON.stringify(messages ?? "");
  return Math.max(100, Math.ceil(text.length / 4));
}

/** 解析请求中的 max output tokens，带上限 */
export function resolveMaxCompletionTokens(
  body: Record<string, unknown>
): number {
  const raw = body.max_tokens ?? body.maxTokens;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.min(Math.floor(raw), MAX_RESERVE_COMPLETION_TOKENS);
  }
  return DEFAULT_MAX_COMPLETION_TOKENS;
}

/** 按 prompt + max completion 估算本次最大费用（元，向上取整到分） */
export function estimateMaxRequestCost(
  messages: unknown,
  maxCompletionTokens: number,
  pricing: ModelPricing
): number {
  const promptTokens = estimatePromptTokens(messages);
  const raw =
    (promptTokens / 1_000_000) * pricing.inputPerMillion +
    (maxCompletionTokens / 1_000_000) * pricing.outputPerMillion;
  if (raw <= 0) return 0;
  return Math.max(0.01, Math.ceil(raw * 100) / 100);
}

export function normalizeUsage(usage: Record<string, unknown>): TokenUsage {
  const prompt =
    Number(usage.prompt_tokens ?? usage.input_tokens ?? 0) || 0;
  const completion =
    Number(usage.completion_tokens ?? usage.output_tokens ?? 0) || 0;
  return { prompt_tokens: prompt, completion_tokens: completion };
}

type AdminClient = ReturnType<typeof createAdminClient>;

export async function reserveBalance(
  admin: AdminClient,
  keyId: string,
  amount: number
): Promise<void> {
  const { error } = await admin.rpc("reserve_balance", {
    p_key_id: keyId,
    p_amount: amount,
  });
  if (error) throw new BillingError(error.message);
}

export async function settleBalance(
  admin: AdminClient,
  keyId: string,
  reservedAmount: number,
  actualAmount: number
): Promise<void> {
  const { error } = await admin.rpc("settle_balance", {
    p_key_id: keyId,
    p_reserved: reservedAmount,
    p_actual: actualAmount,
  });
  if (error) throw new BillingError(error.message);
}

export async function releaseBalance(
  admin: AdminClient,
  keyId: string,
  amount: number
): Promise<void> {
  const { error } = await admin.rpc("release_balance", {
    p_key_id: keyId,
    p_amount: amount,
  });
  if (error) throw new BillingError(error.message);
}

export async function logUsage(
  admin: AdminClient,
  apiKeyRecord: { id: string; user_id: string },
  model: string,
  usage: TokenUsage,
  cost: number
): Promise<void> {
  if (cost <= 0) return;

  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;

  await admin.from("usage_logs").insert({
    api_key_id: apiKeyRecord.id,
    user_id: apiKeyRecord.user_id,
    model,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
    cost,
    success: true,
  });
}

type UpstreamResult = {
  ok: boolean;
  status: number;
  data: unknown;
  usage?: TokenUsage;
};

export type BillingMeta = {
  costCny: number;
  balanceCny: number;
};

async function fetchUserBalance(
  admin: AdminClient,
  userId: string
): Promise<number> {
  const { data, error } = await admin
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();

  if (!error && data?.balance != null) {
    return Number(data.balance);
  }

  const { data: keyRow } = await admin
    .from("api_keys")
    .select("balance")
    .eq("user_id", userId);

  return (keyRow ?? []).reduce((sum, row) => sum + Number(row.balance), 0);
}

/**
 * 先冻结余额 → 调用上游 → 成功则按实际用量结算，失败则释放冻结。
 * 结算失败时不返回上游结果，避免白嫖。
 */
export async function executeWithBilling(
  admin: AdminClient,
  apiKeyRecord: { id: string; user_id: string },
  modelId: string,
  pricing: ModelPricing,
  reserveContext: { messages: unknown; maxCompletionTokens: number },
  runUpstream: () => Promise<UpstreamResult>
): Promise<
  | { ok: true; status: number; data: unknown; billing?: BillingMeta }
  | { ok: false; response: Response }
> {
  const reservedAmount = estimateMaxRequestCost(
    reserveContext.messages,
    reserveContext.maxCompletionTokens,
    pricing
  );

  if (reservedAmount <= 0) {
    const result = await runUpstream();
    return { ok: true, status: result.status, data: result.data };
  }

  try {
    await reserveBalance(admin, apiKeyRecord.id, reservedAmount);
  } catch (e) {
    if (e instanceof BillingError && e.isInsufficientBalance()) {
      return {
        ok: false,
        response: Response.json(
          {
            error: {
              message: "额度不足，请充值",
              type: "insufficient_quota",
            },
          },
          { status: 402 }
        ),
      };
    }
    throw e;
  }

  try {
    const result = await runUpstream();

    if (!result.ok || !result.usage) {
      await releaseBalance(admin, apiKeyRecord.id, reservedAmount);
      return { ok: true, status: result.status, data: result.data };
    }

    const actualCost = calculateUsageCost(result.usage, pricing);

    try {
      await settleBalance(
        admin,
        apiKeyRecord.id,
        reservedAmount,
        actualCost
      );
      await logUsage(admin, apiKeyRecord, modelId, result.usage, actualCost);
      const balanceCny = await fetchUserBalance(admin, apiKeyRecord.user_id);
      return {
        ok: true,
        status: result.status,
        data: result.data,
        billing: {
          costCny: actualCost,
          balanceCny: Number(balanceCny.toFixed(2)),
        },
      };
    } catch (e) {
      try {
        await releaseBalance(admin, apiKeyRecord.id, reservedAmount);
      } catch (releaseErr) {
        console.error("结算失败后释放冻结也失败:", releaseErr);
      }
      console.error("结算失败:", e);
      return {
        ok: false,
        response: Response.json(
          {
            error: {
              message: "计费失败，请稍后重试",
              type: "billing_error",
            },
          },
          { status: 500 }
        ),
      };
    }
  } catch (e) {
    try {
      await releaseBalance(admin, apiKeyRecord.id, reservedAmount);
    } catch (releaseErr) {
      console.error("上游异常后释放冻结失败:", releaseErr);
    }
    throw e;
  }
}

type FixedUpstreamResult = {
  ok: boolean;
  status: number;
  data: unknown;
};

/** 按次扣费（图像/视频生成） */
export async function executeWithFixedBilling(
  admin: AdminClient,
  apiKeyRecord: { id: string; user_id: string },
  modelId: string,
  amountYuan: number,
  runUpstream: () => Promise<FixedUpstreamResult>
): Promise<
  | { ok: true; status: number; data: unknown; billing?: BillingMeta }
  | { ok: false; response: Response }
> {
  const charge = Number(Number(amountYuan).toFixed(2));
  if (charge <= 0) {
    const result = await runUpstream();
    return { ok: true, status: result.status, data: result.data };
  }

  try {
    await reserveBalance(admin, apiKeyRecord.id, charge);
  } catch (e) {
    if (e instanceof BillingError && e.isInsufficientBalance()) {
      return {
        ok: false,
        response: Response.json(
          {
            error: {
              message: "额度不足，请充值",
              type: "insufficient_quota",
            },
          },
          { status: 402 }
        ),
      };
    }
    throw e;
  }

  try {
    const result = await runUpstream();
    if (!result.ok) {
      await releaseBalance(admin, apiKeyRecord.id, charge);
      return { ok: true, status: result.status, data: result.data };
    }

    try {
      await settleBalance(admin, apiKeyRecord.id, charge, charge);
      await logUsage(
        admin,
        apiKeyRecord,
        modelId,
        { prompt_tokens: 0, completion_tokens: 0 },
        charge
      );
      const balanceCny = await fetchUserBalance(admin, apiKeyRecord.user_id);
      return {
        ok: true,
        status: result.status,
        data: result.data,
        billing: {
          costCny: charge,
          balanceCny: Number(balanceCny.toFixed(2)),
        },
      };
    } catch (e) {
      try {
        await releaseBalance(admin, apiKeyRecord.id, charge);
      } catch (releaseErr) {
        console.error("按次结算失败后释放冻结也失败:", releaseErr);
      }
      console.error("按次结算失败:", e);
      return {
        ok: false,
        response: Response.json(
          {
            error: {
              message: "计费失败，请稍后重试",
              type: "billing_error",
            },
          },
          { status: 500 }
        ),
      };
    }
  } catch (e) {
    try {
      await releaseBalance(admin, apiKeyRecord.id, charge);
    } catch (releaseErr) {
      console.error("生成异常后释放冻结失败:", releaseErr);
    }
    throw e;
  }
}
