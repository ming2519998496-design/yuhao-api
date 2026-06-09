import { createAdminClient } from "@/lib/supabase-admin";
import {
  ANNOUNCEMENTS_KEY,
  DEFAULT_ANNOUNCEMENTS,
  mergeAnnouncements,
  sortAnnouncements,
  type Announcement,
  type AnnouncementsPayload,
} from "@/lib/announcements-settings";

function isMissingTableError(message: string) {
  return (
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

let cache: {
  payload: AnnouncementsPayload;
  updatedAt: string | null;
  expiresAt: number;
} | null = null;

const CACHE_TTL_MS = 30_000;

export function invalidateAnnouncementsCache() {
  cache = null;
}

export async function loadAnnouncements(): Promise<{
  items: Announcement[];
  updatedAt: string | null;
}> {
  if (cache && cache.expiresAt > Date.now()) {
    return { items: cache.payload.items, updatedAt: cache.updatedAt };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .select("value, updated_at")
    .eq("key", ANNOUNCEMENTS_KEY)
    .maybeSingle();

  if (!error && data?.value) {
    const payload = mergeAnnouncements(data.value);
    cache = {
      payload,
      updatedAt: data.updated_at ?? null,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return { items: payload.items, updatedAt: cache.updatedAt };
  }

  if (error && !isMissingTableError(error.message)) {
    throw new Error(error.message);
  }

  const payload = { items: sortAnnouncements([...DEFAULT_ANNOUNCEMENTS]) };
  cache = {
    payload,
    updatedAt: null,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  return { items: payload.items, updatedAt: null };
}

export async function saveAnnouncements(
  items: Announcement[],
  userId: string
): Promise<void> {
  const admin = createAdminClient();
  const payload: AnnouncementsPayload = {
    items: sortAnnouncements(items),
  };

  const { error } = await admin.from("platform_settings").upsert({
    key: ANNOUNCEMENTS_KEY,
    value: payload,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  invalidateAnnouncementsCache();
}
