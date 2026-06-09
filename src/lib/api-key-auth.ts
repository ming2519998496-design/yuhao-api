import crypto from "crypto";
import {
  DEFAULT_MODEL_ID,
  isModelAllowedForKey,
  resolveAllowedCategoryIds,
} from "@/lib/api-key-models";
import {
  isMissingModelColumnsError,
  KEY_AUTH_SELECT_FULL,
  KEY_AUTH_SELECT_LEGACY,
} from "@/lib/api-keys-db";
import { getEffectiveModelConfig } from "@/lib/model-pricing-store";
import type { ModelConfig } from "@/lib/models";
import { createAdminClient } from "@/lib/supabase-admin";

export type AuthenticatedApiKey = {
  id: string;
  user_id: string;
  balance: number;
  allowedCategories: string[];
};

export type ApiKeyAuthResult =
  | { ok: true; apiKey: AuthenticatedApiKey; modelConfig: ModelConfig }
  | { ok: false; response: Response };

export async function authenticateApiKeyRequest(
  authorization: string | null,
  requestedModel?: string,
  defaultModelId?: string | null
): Promise<ApiKeyAuthResult> {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return {
      ok: false,
      response: Response.json(
        { error: { message: "请提供 API Key", type: "auth_error" } },
        { status: 401 }
      ),
    };
  }

  const rawKey = authorization.slice(7).trim();
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const admin = createAdminClient();

  let keyResult = await admin
    .from("api_keys")
    .select(KEY_AUTH_SELECT_FULL)
    .eq("key_hash", keyHash)
    .single();

  if (keyResult.error && isMissingModelColumnsError(keyResult.error.message)) {
    keyResult = await admin
      .from("api_keys")
      .select(KEY_AUTH_SELECT_LEGACY)
      .eq("key_hash", keyHash)
      .single();
  }

  const row = keyResult.data;
  if (keyResult.error || !row) {
    return {
      ok: false,
      response: Response.json(
        { error: { message: "无效的 API Key", type: "auth_error" } },
        { status: 401 }
      ),
    };
  }

  if (!row.is_active) {
    return {
      ok: false,
      response: Response.json(
        { error: { message: "API Key 已被禁用", type: "auth_error" } },
        { status: 403 }
      ),
    };
  }

  const modelId =
    typeof requestedModel === "string" && requestedModel.trim()
      ? requestedModel.trim()
      : (defaultModelId as string | undefined) ?? DEFAULT_MODEL_ID;

  if (!modelId) {
    return {
      ok: false,
      response: Response.json(
        {
          error: {
            message: "请指定 model 参数",
            type: "invalid_request_error",
          },
        },
        { status: 400 }
      ),
    };
  }

  const modelConfig = await getEffectiveModelConfig(modelId);
  if (!modelConfig) {
    return {
      ok: false,
      response: Response.json(
        {
          error: {
            message: `不支持的模型: ${modelId}`,
            type: "invalid_request_error",
          },
        },
        { status: 400 }
      ),
    };
  }

  const allowedCategories = resolveAllowedCategoryIds(
    row.allowed_category_ids as string[] | undefined
  );

  if (!isModelAllowedForKey(modelId, allowedCategories)) {
    return {
      ok: false,
      response: Response.json(
        {
          error: {
            message: `此 API Key 无权调用模型 ${modelId}，请在令牌管理勾选对应分组`,
            type: "permission_error",
          },
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    apiKey: {
      id: row.id,
      user_id: row.user_id,
      balance: Number(row.balance),
      allowedCategories,
    },
    modelConfig,
  };
}
