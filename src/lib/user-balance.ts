import { createAdminClient } from "@/lib/supabase-admin";
import crypto from "crypto";

function isMissingProfileBalanceColumn(message: string) {
  return (
    message.includes("balance") &&
    (message.includes("profiles") ||
      message.includes("schema cache") ||
      message.includes("does not exist"))
  );
}

/** 读取用户账户共享余额（元） */
export async function getUserTotalBalance(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();

  if (!error && profile && profile.balance != null) {
    return Number(profile.balance);
  }

  if (error && !isMissingProfileBalanceColumn(error.message)) {
    throw new Error(error.message);
  }

  // 迁移前兜底：汇总各 Key 余额
  const { data: keys } = await admin
    .from("api_keys")
    .select("balance")
    .eq("user_id", userId);

  return (keys ?? []).reduce((sum, k) => sum + Number(k.balance), 0);
}

function createKeyMaterial() {
  const raw = `yh_${crypto.randomBytes(24).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 12) + "...";
  return { hash, prefix };
}

async function creditProfileBalance(
  userId: string,
  amount: number
): Promise<void> {
  const admin = createAdminClient();
  const current = await getUserTotalBalance(userId);
  const newBalance = Number((current + amount).toFixed(2));
  const { error } = await admin
    .from("profiles")
    .update({ balance: newBalance })
    .eq("id", userId);

  if (error) {
    if (isMissingProfileBalanceColumn(error.message)) {
      await creditLegacyKeyBalance(userId, amount);
      return;
    }
    throw new Error(error.message);
  }
}

async function creditLegacyKeyBalance(
  userId: string,
  amount: number
): Promise<void> {
  const admin = createAdminClient();
  const { data: keys } = await admin
    .from("api_keys")
    .select("id, balance")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (keys?.length) {
    const newBalance = Number((Number(keys[0].balance) + amount).toFixed(2));
    const { error } = await admin
      .from("api_keys")
      .update({ balance: newBalance })
      .eq("id", keys[0].id);
    if (error) throw new Error(error.message);
    return;
  }

  const { hash, prefix } = createKeyMaterial();
  const { error } = await admin.from("api_keys").insert({
    user_id: userId,
    key_hash: hash,
    key_prefix: prefix,
    name: "默认密钥",
    balance: amount,
    allowed_category_ids: [
      "openai",
      "openai-image",
      "google",
      "google-image",
      "google-video",
      "deepseek",
    ],
    default_model_id: "gpt-4o-mini",
  });
  if (error) throw new Error(error.message);
}

/** 给用户账户增加余额；无 Key 时仅入账账户（不强制创建 Key） */
export async function creditUserBalance(
  userId: string,
  amount: number
): Promise<number> {
  if (amount <= 0) return getUserTotalBalance(userId);
  await creditProfileBalance(userId, amount);
  return getUserTotalBalance(userId);
}

/** 将用户账户余额设为指定值 */
export async function setProfileBalance(
  userId: string,
  targetBalance: number
): Promise<number> {
  const balance = Math.max(0, Number(Number(targetBalance).toFixed(2)));
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ balance })
    .eq("id", userId);

  if (error) {
    if (isMissingProfileBalanceColumn(error.message)) {
      return setLegacyKeyBalance(userId, balance);
    }
    throw new Error(error.message);
  }

  await admin.from("api_keys").update({ balance: 0 }).eq("user_id", userId);
  return balance;
}

async function setLegacyKeyBalance(
  userId: string,
  balance: number
): Promise<number> {
  const admin = createAdminClient();
  const { data: keys, error: fetchErr } = await admin
    .from("api_keys")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (fetchErr) throw new Error(fetchErr.message);

  if (!keys?.length) {
    if (balance <= 0) return 0;
    await creditLegacyKeyBalance(userId, balance);
    return balance;
  }

  const primaryId = keys[0].id;
  const otherIds = keys.slice(1).map((k) => k.id);

  if (otherIds.length) {
    const { error } = await admin
      .from("api_keys")
      .update({ balance: 0 })
      .in("id", otherIds);
    if (error) throw new Error(error.message);
  }

  const { error: primaryErr } = await admin
    .from("api_keys")
    .update({ balance })
    .eq("id", primaryId);

  if (primaryErr) throw new Error(primaryErr.message);
  return balance;
}
