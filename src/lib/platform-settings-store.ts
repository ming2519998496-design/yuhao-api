import { createAdminClient } from "@/lib/supabase-admin";
import {
  PAYMENT_PENDING_KEY,
  type PaymentAccountsPending,
} from "@/lib/payment-approval";
import {
  DEFAULT_PAYMENT_ACCOUNTS,
  mergePaymentAccounts,
  type PaymentAccountsConfig,
} from "@/lib/payment-settings";
import { ensurePaymentQrBucket, PAYMENT_QR_BUCKET } from "@/lib/storage-payment";

const PAYMENT_KEY = "payment_accounts";
const STORAGE_CONFIG_PATH = "settings/payment_accounts.json";
const STORAGE_BACKUP_PATH = "settings/payment_accounts.backup.json";

function isMissingTableError(message: string) {
  return (
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

async function readStorageJson(
  path: string
): Promise<PaymentAccountsConfig | null> {
  const admin = createAdminClient();
  await ensurePaymentQrBucket(admin);

  const { data, error } = await admin.storage
    .from(PAYMENT_QR_BUCKET)
    .download(path);

  if (error) return null;

  const text = await data.text();
  return mergePaymentAccounts(JSON.parse(text));
}

async function writeStorageJson(
  path: string,
  accounts: PaymentAccountsConfig
): Promise<void> {
  const admin = createAdminClient();
  await ensurePaymentQrBucket(admin);

  const body = JSON.stringify(accounts);
  const { error } = await admin.storage
    .from(PAYMENT_QR_BUCKET)
    .upload(path, body, {
      contentType: "application/json",
      upsert: true,
    });

  if (error) throw new Error(error.message);
}

async function readFromStorage(): Promise<PaymentAccountsConfig | null> {
  return readStorageJson(STORAGE_CONFIG_PATH);
}

async function readFromStorageBackup(): Promise<PaymentAccountsConfig | null> {
  return readStorageJson(STORAGE_BACKUP_PATH);
}

async function writeToStorage(accounts: PaymentAccountsConfig) {
  await writeStorageJson(STORAGE_CONFIG_PATH, accounts);
}

async function writeToStorageBackup(accounts: PaymentAccountsConfig) {
  await writeStorageJson(STORAGE_BACKUP_PATH, accounts);
}

/** 读取主配置（数据库）与 Storage 备选配置（镜像 + 历史备份） */
export async function loadPaymentAccountsForDisplay(): Promise<{
  primary: PaymentAccountsConfig;
  backup: PaymentAccountsConfig | null;
  updatedAt: string | null;
  source: "database" | "storage";
}> {
  const loaded = await loadPaymentAccounts();
  const mirror = await readFromStorage();
  const archive = await readFromStorageBackup();

  const backup = archive ?? mirror;
  if (!backup) {
    return {
      primary: loaded.accounts,
      backup: null,
      updatedAt: loaded.updatedAt,
      source: loaded.source,
    };
  }

  return {
    primary: loaded.accounts,
    backup,
    updatedAt: loaded.updatedAt,
    source: loaded.source,
  };
}

export async function loadPaymentAccounts(): Promise<{
  accounts: PaymentAccountsConfig;
  updatedAt: string | null;
  source: "database" | "storage";
}> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_settings")
    .select("value, updated_at")
    .eq("key", PAYMENT_KEY)
    .maybeSingle();

  if (!error && data) {
    return {
      accounts: mergePaymentAccounts(data.value),
      updatedAt: data.updated_at ?? null,
      source: "database",
    };
  }

  if (error && !isMissingTableError(error.message)) {
    throw new Error(error.message);
  }

  const fromStorage = await readFromStorage();
  return {
    accounts: fromStorage ?? mergePaymentAccounts(DEFAULT_PAYMENT_ACCOUNTS),
    updatedAt: null,
    source: "storage",
  };
}

export async function savePaymentAccounts(
  accounts: PaymentAccountsConfig,
  userId: string
): Promise<{ source: "database" | "storage" }> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", PAYMENT_KEY)
    .maybeSingle();

  if (existing?.value) {
    try {
      await writeToStorageBackup(mergePaymentAccounts(existing.value));
    } catch (e) {
      console.error("[payment] backup snapshot failed:", e);
    }
  } else {
    const fromStorage = await readFromStorage();
    if (fromStorage) {
      try {
        await writeToStorageBackup(fromStorage);
      } catch (e) {
        console.error("[payment] backup snapshot failed:", e);
      }
    }
  }

  const { error } = await admin.from("platform_settings").upsert({
    key: PAYMENT_KEY,
    value: accounts,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  });

  if (!error) {
    try {
      await writeToStorage(accounts);
    } catch (e) {
      console.error("[payment] storage mirror failed:", e);
    }
    return { source: "database" };
  }

  if (!isMissingTableError(error.message)) {
    throw new Error(error.message);
  }

  const fromStorage = await readFromStorage();
  if (fromStorage) {
    try {
      await writeToStorageBackup(fromStorage);
    } catch (e) {
      console.error("[payment] backup snapshot failed:", e);
    }
  }

  await writeToStorage(accounts);
  return { source: "storage" };
}

export async function loadPaymentPending(): Promise<PaymentAccountsPending | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", PAYMENT_PENDING_KEY)
    .maybeSingle();

  if (error || !data?.value || typeof data.value !== "object") {
    return null;
  }

  const raw = data.value as Record<string, unknown>;
  if (
    typeof raw.proposedBy !== "string" ||
    typeof raw.proposedByEmail !== "string" ||
    typeof raw.proposedAt !== "string" ||
    !raw.accounts
  ) {
    return null;
  }

  return {
    accounts: mergePaymentAccounts(raw.accounts),
    proposedBy: raw.proposedBy,
    proposedByEmail: raw.proposedByEmail,
    proposedAt: raw.proposedAt,
    changedChannels: Array.isArray(raw.changedChannels)
      ? (raw.changedChannels as PaymentAccountsPending["changedChannels"])
      : [],
  };
}

export async function savePaymentPending(pending: PaymentAccountsPending) {
  const admin = createAdminClient();
  const { error } = await admin.from("platform_settings").upsert({
    key: PAYMENT_PENDING_KEY,
    value: pending,
    updated_at: new Date().toISOString(),
    updated_by: pending.proposedBy,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function clearPaymentPending() {
  const admin = createAdminClient();
  await admin.from("platform_settings").delete().eq("key", PAYMENT_PENDING_KEY);
}
