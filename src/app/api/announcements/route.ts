import { getSessionUser } from "@/lib/auth-admin";
import { loadAnnouncements } from "@/lib/announcements-store";
import { NextResponse } from "next/server";

/** 登录用户读取公告列表 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { items, updatedAt } = await loadAnnouncements();
    return NextResponse.json({ items, updatedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : "读取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
