import {
  ALL_CATEGORY_IDS,
  DEFAULT_MODEL_ID,
  resolveAllowedCategoryIds,
} from "@/lib/api-key-models";

export const MIGRATION_HINT =
  "请在 Supabase SQL Editor 中 Create a new snippet，Run 项目根目录的 supabase-api-key-models.sql（步骤见 docs/supabase-sql-editor-only.md）";

export const KEYS_SELECT_FULL =
  "id, key_prefix, name, balance, total_usage, is_active, allowed_category_ids, default_model_id, created_at, last_used_at";

export const KEYS_SELECT_LEGACY =
  "id, key_prefix, name, balance, total_usage, is_active, created_at, last_used_at";

export const KEY_AUTH_SELECT_FULL =
  "id, user_id, balance, is_active, allowed_category_ids, default_model_id";

export const KEY_AUTH_SELECT_LEGACY = "id, user_id, balance, is_active";

export function isMissingModelColumnsError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("allowed_category_ids") ||
    m.includes("default_model_id") ||
    (m.includes("column") && m.includes("does not exist"))
  );
}

export function normalizeKeyRow<T extends Record<string, unknown>>(row: T) {
  return {
    ...row,
    allowed_category_ids: resolveAllowedCategoryIds(
      row.allowed_category_ids as string[] | null | undefined
    ),
    default_model_id:
      (row.default_model_id as string | undefined) ?? DEFAULT_MODEL_ID,
  };
}

export function legacyKeyDefaults() {
  return {
    allowed_category_ids: [...ALL_CATEGORY_IDS],
    default_model_id: DEFAULT_MODEL_ID,
  };
}
