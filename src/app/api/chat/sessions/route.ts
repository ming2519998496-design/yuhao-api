import {
  createChatSession,
  listChatSessions,
} from "@/lib/chat-history-db";
import type { ChatMode } from "@/lib/chat-models";
import { requireActiveUserResponse } from "@/lib/session-api";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireActiveUserResponse();
  if (auth.response) return auth.response;

  const result = await listChatSessions(auth.user.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ sessions: result.sessions });
}

export async function POST(request: NextRequest) {
  const auth = await requireActiveUserResponse();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const mode = body.mode as ChatMode;
  const modelId = typeof body.modelId === "string" ? body.modelId.trim() : "";
  const apiKeyId =
    typeof body.apiKeyId === "string" ? body.apiKeyId.trim() : null;
  const title = typeof body.title === "string" ? body.title : undefined;

  if (!modelId) {
    return NextResponse.json({ error: "请指定 modelId" }, { status: 400 });
  }
  if (mode !== "chat" && mode !== "image" && mode !== "video") {
    return NextResponse.json({ error: "无效的模式" }, { status: 400 });
  }

  const result = await createChatSession(auth.user.id, {
    mode,
    modelId,
    apiKeyId,
    title,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ session: result.session });
}
