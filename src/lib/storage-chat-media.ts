import type { SupabaseClient } from "@supabase/supabase-js";

export const CHAT_MEDIA_BUCKET = "chat-media";

export const CHAT_MEDIA_MAX_BYTES = 80 * 1024 * 1024;

export const CHAT_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
]);

export async function ensureChatMediaBucket(
  admin: SupabaseClient
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();

  if (listError) {
    return { ok: false, error: listError.message };
  }

  if (buckets?.some((b) => b.name === CHAT_MEDIA_BUCKET)) {
    return { ok: true };
  }

  const { error: createError } = await admin.storage.createBucket(
    CHAT_MEDIA_BUCKET,
    {
      public: true,
      fileSizeLimit: CHAT_MEDIA_MAX_BYTES,
      allowedMimeTypes: [...CHAT_MEDIA_TYPES],
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

export async function uploadChatMediaBuffer(
  admin: SupabaseClient,
  userId: string,
  sessionId: string,
  buffer: Buffer,
  mime: string,
  index = 0
): Promise<{ url: string } | { error: string }> {
  if (!CHAT_MEDIA_TYPES.has(mime)) {
    return { error: `不支持的媒体类型: ${mime}` };
  }
  if (buffer.length > CHAT_MEDIA_MAX_BYTES) {
    return { error: "媒体文件过大，无法存入历史记录" };
  }

  const bucketReady = await ensureChatMediaBucket(admin);
  if (!bucketReady.ok) {
    return { error: bucketReady.error };
  }

  const ext =
    mime === "video/mp4"
      ? "mp4"
      : mime === "video/webm"
        ? "webm"
        : mime === "image/jpeg"
          ? "jpg"
          : mime === "image/webp"
            ? "webp"
            : mime === "image/gif"
              ? "gif"
              : "png";

  const path = `${userId}/${sessionId}/${Date.now()}-${index}.${ext}`;

  const { error } = await admin.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(path, buffer, {
      contentType: mime,
      upsert: false,
    });

  if (error) {
    return { error: error.message };
  }

  const { data } = admin.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
