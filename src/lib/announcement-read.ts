const STORAGE_PREFIX = "yuhao_announcement_seen_v1:";

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function getSeenAnnouncementIds(userId: string): Set<string> {
  if (typeof window === "undefined" || !userId) return new Set();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function markAnnouncementsSeen(userId: string, ids: string[]): void {
  if (typeof window === "undefined" || !userId || ids.length === 0) return;
  const next = getSeenAnnouncementIds(userId);
  for (const id of ids) next.add(id);
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...next]));
  } catch {
    // ignore quota / private mode
  }
}
