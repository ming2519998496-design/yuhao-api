import type { ParsedGenerationMedia } from "@/lib/generation-media";
import {
  extensionFromMime,
  resolveMediaMime,
  type GenerationMediaItem,
} from "@/lib/generation-media";
import { uploadChatMediaBuffer } from "@/lib/storage-chat-media";
import type { SupabaseClient } from "@supabase/supabase-js";

/** 历史记录仅存 url / uri，不写入 base64 */
export function linkOnlyMediaItem(
  item: GenerationMediaItem
): GenerationMediaItem | null {
  if (item.url?.trim()) {
    return { url: item.url.trim(), mime_type: item.mime_type };
  }
  if (item.uri?.trim()) {
    return { uri: item.uri.trim(), mime_type: item.mime_type };
  }
  return null;
}

export function isSupabaseChatMediaUrl(url: string): boolean {
  return url.includes("/storage/v1/object/public/chat-media/");
}

/** 将媒体转为可持久化的链接形式（无 base64） */
export async function resolveMediaForHistoryStorage(
  admin: SupabaseClient,
  userId: string,
  sessionId: string,
  media: ParsedGenerationMedia | null | undefined
): Promise<ParsedGenerationMedia | null> {
  if (!media?.items?.length) return null;

  const kind = media.kind;
  const resolved: GenerationMediaItem[] = [];

  for (let i = 0; i < media.items.length; i += 1) {
    const item = media.items[i];
    const existingLink = linkOnlyMediaItem(item);
    if (existingLink) {
      resolved.push(existingLink);
      continue;
    }

    if (item.b64_json) {
      const mime = resolveMediaMime(item, kind);
      const buffer = Buffer.from(item.b64_json, "base64");
      const uploaded = await uploadChatMediaBuffer(
        admin,
        userId,
        sessionId,
        buffer,
        mime,
        i
      );
      if ("url" in uploaded) {
        resolved.push({ url: uploaded.url, mime_type: mime });
      }
    }
  }

  if (resolved.length === 0) return null;
  return { kind, items: resolved };
}

export function mediaDownloadFilename(
  kind: ParsedGenerationMedia["kind"],
  mime: string,
  index: number
): string {
  const ext = extensionFromMime(mime);
  return `yuhao-${kind}-${index + 1}.${ext}`;
}
