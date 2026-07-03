import {
  deleteChatSession,
  getChatSessionForUser,
  updateChatSessionTitle,
} from "@/lib/chat-history-db";
import { guardWebApiRequest } from "@/lib/anti-abuse";
import { requireActiveUserResponse } from "@/lib/session-api";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireActiveUserResponse();
  if (auth.response) return auth.response;

  const guard = await guardWebApiRequest(request, {
    userId: auth.user.id,
  });
  if (guard) return guard;

  const { id } = await context.params;
  const result = await getChatSessionForUser(auth.user.id, id);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    session: result.session,
    messages: result.messages,
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireActiveUserResponse();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title : "";

  if (!title.trim()) {
    return NextResponse.json({ error: "请提供标题" }, { status: 400 });
  }

  const guard = await guardWebApiRequest(request, {
    userId: auth.user.id,
  });
  if (guard) return guard;

  const result = await updateChatSessionTitle(auth.user.id, id, title);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireActiveUserResponse();
  if (auth.response) return auth.response;

  const guard = await guardWebApiRequest(request, {
    userId: auth.user.id,
  });
  if (guard) return guard;

  const { id } = await context.params;
  const result = await deleteChatSession(auth.user.id, id);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true });
}
