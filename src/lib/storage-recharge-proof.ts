import type { SupabaseClient } from "@supabase/supabase-js";

export const RECHARGE_PROOF_BUCKET = "recharge-proofs";

export const RECHARGE_PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const RECHARGE_PROOF_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function ensureRechargeProofBucket(
  admin: SupabaseClient
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();

  if (listError) {
    return { ok: false, error: listError.message };
  }

  if (buckets?.some((b) => b.name === RECHARGE_PROOF_BUCKET)) {
    return { ok: true };
  }

  const { error: createError } = await admin.storage.createBucket(
    RECHARGE_PROOF_BUCKET,
    {
      public: true,
      fileSizeLimit: RECHARGE_PROOF_MAX_BYTES,
      allowedMimeTypes: [...RECHARGE_PROOF_TYPES],
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

export async function uploadRechargeProof(
  admin: SupabaseClient,
  userId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  if (!RECHARGE_PROOF_TYPES.has(file.type)) {
    return { error: "凭证仅支持 JPG、PNG、WebP、GIF" };
  }
  if (file.size > RECHARGE_PROOF_MAX_BYTES) {
    return { error: "凭证图片不能超过 5MB" };
  }

  const bucketReady = await ensureRechargeProofBucket(admin);
  if (!bucketReady.ok) {
    return { error: bucketReady.error };
  }

  const ext =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage
    .from(RECHARGE_PROOF_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return { error: error.message };
  }

  const { data } = admin.storage.from(RECHARGE_PROOF_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
