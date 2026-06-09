import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  ALL_CATEGORY_IDS,
  DEFAULT_MODEL_ID,
  normalizeAllowedCategoryIds,
  resolveAllowedCategoryIds,
  validateKeyModelConfig,
} from "@/lib/api-key-models";
import {
  isMissingModelColumnsError,
  KEYS_SELECT_FULL,
  KEYS_SELECT_LEGACY,
  MIGRATION_HINT,
  normalizeKeyRow,
} from "@/lib/api-keys-db";
import { getUserTotalBalance } from "@/lib/user-balance";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `yh_${crypto.randomBytes(24).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 12) + "...";
  return { raw, hash, prefix };
}

async function listUserKeys(userId: string) {
  const admin = createAdminClient();
  const result = await admin
    .from("api_keys")
    .select(KEYS_SELECT_FULL)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (result.error && isMissingModelColumnsError(result.error.message)) {
    const legacy = await admin
      .from("api_keys")
      .select(KEYS_SELECT_LEGACY)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (legacy.error) {
      return { error: legacy.error.message, schemaReady: false as const };
    }
    return {
      keys: (legacy.data ?? []).map((row) => normalizeKeyRow(row)),
      schemaReady: false as const,
      migrationHint: MIGRATION_HINT,
    };
  }

  if (result.error) {
    return { error: result.error.message, schemaReady: false as const };
  }

  return {
    keys: (result.data ?? []).map((row) => normalizeKeyRow(row)),
    schemaReady: true as const,
  };
}

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const listed = await listUserKeys(user.id);
  if ("error" in listed && listed.error) {
    return NextResponse.json({ error: listed.error }, { status: 500 });
  }

  let accountBalance = 0;
  try {
    accountBalance = await getUserTotalBalance(user.id);
  } catch {
    accountBalance = (listed.keys ?? []).reduce(
      (sum, k) => sum + Number(k.balance ?? 0),
      0
    );
  }

  return NextResponse.json({
    keys: listed.keys,
    accountBalance: Number(accountBalance.toFixed(2)),
    schemaReady: listed.schemaReady,
    migrationHint: listed.schemaReady ? undefined : listed.migrationHint,
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const name = body.name || "默认密钥";
    const allowedCategoryIds =
      normalizeAllowedCategoryIds(body.allowedCategoryIds) ?? [...ALL_CATEGORY_IDS];
    const defaultModelId =
      typeof body.defaultModelId === "string" ? body.defaultModelId : DEFAULT_MODEL_ID;

    const modelCheck = validateKeyModelConfig(defaultModelId, allowedCategoryIds);
    if (!modelCheck.ok) {
      return NextResponse.json({ error: modelCheck.error }, { status: 400 });
    }

    const admin = createAdminClient();
    const { count } = await admin
      .from("api_keys")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count >= 10) {
      return NextResponse.json({ error: "每个账户最多创建 10 个 API Key" }, { status: 400 });
    }

    const { raw, hash, prefix } = generateApiKey();

    let { error } = await admin.from("api_keys").insert({
      user_id: user.id,
      key_hash: hash,
      key_prefix: prefix,
      name,
      allowed_category_ids: allowedCategoryIds,
      default_model_id: defaultModelId,
    });

    if (error && isMissingModelColumnsError(error.message)) {
      ({ error } = await admin.from("api_keys").insert({
        user_id: user.id,
        key_hash: hash,
        key_prefix: prefix,
        name,
      }));
      if (!error) {
        return NextResponse.json({
          key: raw,
          defaultModelId,
          allowedCategoryIds,
          schemaReady: false,
          migrationHint: MIGRATION_HINT,
          message: "请立即保存此 Key，之后不再显示",
        });
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      key: raw,
      defaultModelId,
      allowedCategoryIds,
      schemaReady: true,
      message: "请立即保存此 Key，之后不再显示",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "创建令牌失败";
    console.error("POST /api/keys:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const keyId = typeof body.id === "string" ? body.id : "";
  if (!keyId) {
    return NextResponse.json({ error: "缺少 Key ID" }, { status: 400 });
  }

  const admin = createAdminClient();
  let existingResult = await admin
    .from("api_keys")
    .select("allowed_category_ids, default_model_id")
    .eq("id", keyId)
    .eq("user_id", user.id)
    .single();

  let schemaReady = true;
  if (
    existingResult.error &&
    isMissingModelColumnsError(existingResult.error.message)
  ) {
    schemaReady = false;
    existingResult = await admin
      .from("api_keys")
      .select("id")
      .eq("id", keyId)
      .eq("user_id", user.id)
      .single();
  }

  if (existingResult.error || !existingResult.data) {
    return NextResponse.json({ error: "密钥不存在" }, { status: 404 });
  }

  const existing = existingResult.data as {
    allowed_category_ids?: string[];
    default_model_id?: string;
  };

  const updates: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }

  if (body.allowedCategoryIds !== undefined) {
    if (!schemaReady) {
      return NextResponse.json(
        { error: `模型分组功能需先执行数据库迁移。${MIGRATION_HINT}` },
        { status: 400 }
      );
    }
    const allowedCategoryIds =
      normalizeAllowedCategoryIds(body.allowedCategoryIds) ?? [...ALL_CATEGORY_IDS];
    updates.allowed_category_ids = allowedCategoryIds;
  }

  if (typeof body.defaultModelId === "string") {
    if (!schemaReady) {
      return NextResponse.json(
        { error: `默认模型功能需先执行数据库迁移。${MIGRATION_HINT}` },
        { status: 400 }
      );
    }
    updates.default_model_id = body.defaultModelId;
  }

  if (typeof body.isActive === "boolean") {
    updates.is_active = body.isActive;
  }

  if (
    schemaReady &&
    (updates.allowed_category_ids !== undefined ||
      updates.default_model_id !== undefined)
  ) {
    const allowedCategoryIds = resolveAllowedCategoryIds(
      (updates.allowed_category_ids as string[] | undefined) ??
        existing.allowed_category_ids
    );
    const defaultModelId =
      (updates.default_model_id as string | undefined) ??
      existing.default_model_id ??
      DEFAULT_MODEL_ID;

    const modelCheck = validateKeyModelConfig(defaultModelId, allowedCategoryIds);
    if (!modelCheck.ok) {
      return NextResponse.json({ error: modelCheck.error }, { status: 400 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const { error } = await admin
    .from("api_keys")
    .update(updates)
    .eq("id", keyId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("id");

  if (!keyId) {
    return NextResponse.json({ error: "缺少 Key ID" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("api_keys")
    .delete()
    .eq("id", keyId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
