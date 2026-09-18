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

/**
 * 随版本发布的系统公告：按 id 合并进用户可见列表（DB 中已有同 id 则以 DB 为准）。
 * 部署后登录用户会在弹窗 / 公告页看到；无需手工写库。
 */
export const SYSTEM_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-model-catalog-2026-09-18",
    title: "模型库更新：GPT-6 Astra、Gemini 3.8、DeepSeek Flash",
    content: [
      "已同步 OpenAI / Google / DeepSeek 最新对话模型，并按「官方 USD × 7.2 × 分档加价」重算平台价。",
      "",
      "【新增】",
      "· OpenAI：gpt-6-astra（旗舰）",
      "· Google：gemini-3.7-flash、gemini-3.8-flash",
      "· DeepSeek：deepseek-flash（V4.1-Flash 主力；旧 ID deepseek-v4-flash 仍兼容）",
      "",
      "【价目校正（平台价 · 元/百万 tokens · 入/出）】",
      "· gpt-6-astra：¥84.96 / ¥424.80（官价 $10 / $50）",
      "· gpt-5.6-sol：¥33.98 / ¥169.92（官价 $4 / $20）",
      "· gpt-5.6-terra：¥17.28 / ¥103.68（官价 $2 / $12）",
      "· gpt-5.6-luna：¥1.66 / ¥9.94（官价 $0.20 / $1.20）",
      "· gemini-3.8-flash：¥6.37 / ¥31.86（引入价 $0.75 / $3.75，至 2026-12-31）",
      "· gemini-3.7 / 3.6-flash：¥6.48 / ¥32.40（同上引入价）",
      "· deepseek-flash：¥2.48 / ¥9.94（高峰档 $0.30 / $1.20）",
      "· deepseek-v4-pro：¥11.21 / ¥33.64（高峰档 $1.32 / $3.96）",
      "",
      "说明：Gemini 3.6/3.7/3.8 采用 Google 引入价；DeepSeek 按高峰时段价计费以覆盖峰时成本。完整价目见「价目表」或 /docs。",
      "若令牌管理中看不到新模型，请确认 Key 已勾选对应厂商分组。",
    ].join("\n"),
    publishedAt: "2026-09-18T01:10:00.000Z",
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

/** 将系统公告按 id 补齐到列表（不覆盖 DB 中已有同 id） */
export function withSystemAnnouncements(
  items: Announcement[]
): Announcement[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const sys of SYSTEM_ANNOUNCEMENTS) {
    if (!byId.has(sys.id)) {
      byId.set(sys.id, sys);
    }
  }
  return sortAnnouncements([...byId.values()]);
}

export function mergeAnnouncements(raw: unknown): AnnouncementsPayload {
  if (!raw || typeof raw !== "object") {
    return {
      items: withSystemAnnouncements([...DEFAULT_ANNOUNCEMENTS]),
    };
  }
  const obj = raw as Record<string, unknown>;
  const list = Array.isArray(obj.items) ? obj.items : Array.isArray(raw) ? raw : [];
  const items = list
    .map((item) => sanitizeAnnouncement(item))
    .filter((item): item is Announcement => item != null);

  if (items.length === 0) {
    return {
      items: withSystemAnnouncements([...DEFAULT_ANNOUNCEMENTS]),
    };
  }
  return { items: withSystemAnnouncements(items) };
}

/** 按发布时间降序（最新在前）；置顶仅作展示标记，不影响排序 */
export function sortAnnouncements(items: Announcement[]): Announcement[] {
  return [...items].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
  );
}
