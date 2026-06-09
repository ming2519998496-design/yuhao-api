export const ANNOUNCEMENTS_KEY = "announcements";

export type Announcement = {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  pinned?: boolean;
};

export type AnnouncementsPayload = {
  items: Announcement[];
};

export const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "welcome",
    title: "欢迎使用遇好API",
    content:
      "一个 Key 即可调用 GPT、Gemini、DeepSeek 等主流模型。充值后前往「令牌管理」创建 API Key 即可开始调用。",
    publishedAt: "2026-05-19T00:00:00.000Z",
    pinned: true,
  },
];

function slugId(): string {
  return `ann-${Date.now().toString(36)}`;
}

export function sanitizeAnnouncement(raw: unknown): Announcement | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const title = String(obj.title ?? "").trim();
  const content = String(obj.content ?? "").trim();
  const publishedAt = String(obj.publishedAt ?? "").trim();
  const id = String(obj.id ?? "").trim() || slugId();

  if (!title || !content) return null;
  if (!publishedAt || Number.isNaN(Date.parse(publishedAt))) return null;

  return {
    id,
    title: title.slice(0, 120),
    content: content.slice(0, 4000),
    publishedAt: new Date(publishedAt).toISOString(),
    pinned: Boolean(obj.pinned),
  };
}

export function mergeAnnouncements(raw: unknown): AnnouncementsPayload {
  if (!raw || typeof raw !== "object") {
    return { items: [...DEFAULT_ANNOUNCEMENTS] };
  }
  const obj = raw as Record<string, unknown>;
  const list = Array.isArray(obj.items) ? obj.items : Array.isArray(raw) ? raw : [];
  const items = list
    .map((item) => sanitizeAnnouncement(item))
    .filter((item): item is Announcement => item != null);

  if (items.length === 0) {
    return { items: [...DEFAULT_ANNOUNCEMENTS] };
  }
  return { items: sortAnnouncements(items) };
}

export function sortAnnouncements(items: Announcement[]): Announcement[] {
  return [...items].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1;
    }
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
}
