import {
  appendChatMessages,
  type PersistChatMessageInput,
} from "@/lib/chat-history-db";
import { requireActiveUserResponse } from "@/lib/session-api";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function parseMessages(raw: unknown): PersistChatMessageInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const parsed: PersistChatMessageInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (row.role !== "user" && row.role !== "assistant") return null;
    if (typeof row.content !== "string") return null;
    parsed.push({
      role: row.role,
      content: row.content,
      media:
        row.media && typeof row.media === "object"
          ? (row.media as PersistChatMessageInput["media"])
          : null,
      isError: row.isError === true,
    });
  }
  return parsed;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireActiveUserResponse();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const messages = parseMessages(body.messages);
  if (!messages) {
    return NextResponse.json({ error: "无效的消息列表" }, { status: 400 });
  }

  const titleFromFirstUser =
    typeof body.titleFromFirstUser === "string"
      ? body.titleFromFirstUser
      : undefined;

  const result = await appendChatMessages(auth.user.id, id, messages, {
    titleFromFirstUser,
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 500 }
    );
  }

  return NextResponse.json({ messages: result.messages });
}
