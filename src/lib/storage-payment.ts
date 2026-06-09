import type { SupabaseClient } from "@supabase/supabase-js";

export const PAYMENT_QR_BUCKET = "payment-qrcodes";

/** 确保收款码 Storage 桶存在（service_role 可自动创建） */
export async function ensurePaymentQrBucket(
  admin: SupabaseClient
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();

  if (listError) {
    return { ok: false, error: listError.message };
  }

  const exists = buckets?.some((b) => b.name === PAYMENT_QR_BUCKET);
  if (exists) {
    return { ok: true };
  }

  const { error: createError } = await admin.storage.createBucket(
    PAYMENT_QR_BUCKET,
    {
      public: true,
      fileSizeLimit: 2 * 1024 * 1024,
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ],
    }
  );

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      return { ok: true };
    }
    return { ok: false, error: createError.message };
  }

  return { ok: true };
}
