import { requireAdmin } from "@/lib/auth-admin";
import {
  sanitizeAnnouncement,
  sortAnnouncements,
  type Announcement,
} from "@/lib/announcements-settings";
import {
  loadAnnouncements,
  saveAnnouncements,
} from "@/lib/announcements-store";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { items, updatedAt } = await loadAnnouncements();
    return NextResponse.json({ items, updatedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : "读取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { items?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求体" }, { status: 400 });
  }

  const items: Announcement[] = [];
  for (const raw of body.items ?? []) {
    const item = sanitizeAnnouncement(raw);
    if (!item) {
      return NextResponse.json(
        { error: "公告须包含标题、内容与有效发布时间" },
        { status: 400 }
      );
    }
    items.push(item);
  }

  try {
    await saveAnnouncements(sortAnnouncements(items), auth.user!.id);
    const view = await loadAnnouncements();
    return NextResponse.json({
      success: true,
      message: "公告已更新，用户前台立即生效",
      ...view,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
