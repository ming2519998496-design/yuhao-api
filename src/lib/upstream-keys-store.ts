import { createAdminClient } from "@/lib/supabase-admin";
import {
  EMPTY_UPSTREAM_KEYS,
  mergeUpstreamKeys,
  UPSTREAM_KEY,
  type UpstreamKeysConfig,
  type UpstreamProviderId,
} from "@/lib/upstream-keys-settings";

function isMissingTableError(message: string) {
  return (
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

/** @deprecated 保存后已不再需要；保留供兼容调用 */
export function invalidateUpstreamKeysCache() {
  /* no-op：上游 Key 每次从数据库读取，保存即生效 */
}

export async function loadUpstreamKeys(): Promise<{
  keys: UpstreamKeysConfig;
  updatedAt: string | null;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .select("value, updated_at")
    .eq("key", UPSTREAM_KEY)
    .maybeSingle();

  if (!error && data?.value) {
    return {
      keys: mergeUpstreamKeys(data.value),
      updatedAt: data.updated_at ?? null,
    };
  }

  if (error && !isMissingTableError(error.message)) {
    throw new Error(error.message);
  }

  return { keys: { ...EMPTY_UPSTREAM_KEYS }, updatedAt: null };
}

export async function saveUpstreamKeys(
  keys: UpstreamKeysConfig,
  userId: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("platform_settings").upsert({
    key: UPSTREAM_KEY,
    value: keys,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export type UpstreamKeySource = "database" | "env" | "none";

/** 供 API 路由读取：后台配置优先，其次 .env.local；每次实时读库，保存后立即生效 */
export async function resolveUpstreamApiKey(
  provider: string
): Promise<string | null> {
  const id = provider as UpstreamProviderId;
  const { keys } = await loadUpstreamKeys();
  const fromDb = keys[id]?.trim();
  if (fromDb) return fromDb;

  const fromEnv = process.env[`${provider.toUpperCase()}_API_KEY`]?.trim();
  return fromEnv || null;
}

export async function resolveUpstreamApiKeyMeta(
  provider: string
): Promise<{ key: string | null; source: UpstreamKeySource }> {
  const id = provider as UpstreamProviderId;
  const { keys } = await loadUpstreamKeys();
  const fromDb = keys[id]?.trim();
  if (fromDb) return { key: fromDb, source: "database" };

  const fromEnv = process.env[`${provider.toUpperCase()}_API_KEY`]?.trim();
  if (fromEnv) return { key: fromEnv, source: "env" };

  return { key: null, source: "none" };
}

export function tailUpstreamKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "••••";
  return `••••${trimmed.slice(-4)}`;
}
