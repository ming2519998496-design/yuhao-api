import type { ChatMode } from "@/lib/chat-models";
import type { ParsedGenerationMedia } from "@/lib/generation-media";
import { resolveMediaForHistoryStorage } from "@/lib/chat-media-storage";
import { createAdminClient } from "@/lib/supabase-admin";

export type ChatSessionRow = {
  id: string;
  user_id: string;
  title: string;
  mode: ChatMode;
  model_id: string;
  api_key_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRow = {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  media_json: ParsedGenerationMedia | null;
  is_error: boolean;
  sort_order: number;
  created_at: string;
};

export type ChatSessionSummary = {
  id: string;
  title: string;
  mode: ChatMode;
  model_id: string;
  api_key_id: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
  preview: string;
};

export type PersistChatMessageInput = {
  role: "user" | "assistant";
  content: string;
  media?: ParsedGenerationMedia | null;
  isError?: boolean;
};

function isMissingChatHistoryTable(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("chat_sessions") ||
    m.includes("chat_messages") ||
    (m.includes("schema cache") && m.includes("chat_"))
  );
}

export const CHAT_HISTORY_MIGRATION_HINT =
  "请在 Supabase SQL Editor 中 Run 项目根目录的 supabase-chat-history.sql";

function deriveTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "新对话";
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

export async function listChatSessions(
  userId: string,
  limit = 50
): Promise<{ sessions: ChatSessionSummary[] } | { error: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chat_sessions")
    .select("id, title, mode, model_id, api_key_id, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingChatHistoryTable(error.message)) {
      return { error: CHAT_HISTORY_MIGRATION_HINT };
    }
    return { error: error.message };
  }

  const sessions = data ?? [];
  if (sessions.length === 0) {
    return { sessions: [] };
  }

  const sessionIds = sessions.map((s) => s.id);
  const { data: messageRows, error: msgError } = await admin
    .from("chat_messages")
    .select("session_id, content, role, sort_order, created_at")
    .in("session_id", sessionIds)
    .order("sort_order", { ascending: true });

  if (msgError) {
    return { error: msgError.message };
  }

  const stats = new Map<
    string,
    { count: number; preview: string }
  >();

  for (const row of messageRows ?? []) {
    const current = stats.get(row.session_id) ?? { count: 0, preview: "" };
    current.count += 1;
    if (row.role === "user" && row.content.trim()) {
      current.preview = row.content.trim();
    }
    stats.set(row.session_id, current);
  }

  return {
    sessions: sessions.map((s) => {
      const stat = stats.get(s.id);
      return {
        id: s.id,
        title: s.title,
        mode: s.mode as ChatMode,
        model_id: s.model_id,
        api_key_id: s.api_key_id,
        created_at: s.created_at,
        updated_at: s.updated_at,
        message_count: stat?.count ?? 0,
        preview: stat?.preview ?? "",
      };
    }),
  };
}

export async function createChatSession(
  userId: string,
  input: {
    mode: ChatMode;
    modelId: string;
    apiKeyId?: string | null;
    title?: string;
  }
): Promise<{ session: ChatSessionRow } | { error: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chat_sessions")
    .insert({
      user_id: userId,
      title: input.title?.trim() || "新对话",
      mode: input.mode,
      model_id: input.modelId,
      api_key_id: input.apiKeyId ?? null,
    })
    .select(
      "id, user_id, title, mode, model_id, api_key_id, created_at, updated_at"
    )
    .single();

  if (error) {
    if (isMissingChatHistoryTable(error.message)) {
      return { error: CHAT_HISTORY_MIGRATION_HINT };
    }
    return { error: error.message };
  }

  return { session: data as ChatSessionRow };
}

export async function getChatSessionForUser(
  userId: string,
  sessionId: string
): Promise<
  | { session: ChatSessionRow; messages: ChatMessageRow[] }
  | { error: string; status: number }
> {
  const admin = createAdminClient();
  const { data: session, error } = await admin
    .from("chat_sessions")
    .select(
      "id, user_id, title, mode, model_id, api_key_id, created_at, updated_at"
    )
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (error || !session) {
    return { error: "会话不存在", status: 404 };
  }

  const { data: messages, error: msgError } = await admin
    .from("chat_messages")
    .select(
      "id, session_id, role, content, media_json, is_error, sort_order, created_at"
    )
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true });

  if (msgError) {
    return { error: msgError.message, status: 500 };
  }

  return {
    session: session as ChatSessionRow,
    messages: (messages ?? []) as ChatMessageRow[],
  };
}

export async function updateChatSessionTitle(
  userId: string,
  sessionId: string,
  title: string
): Promise<{ ok: true } | { error: string; status: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chat_sessions")
    .update({
      title: title.trim() || "新对话",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    return { error: error.message, status: 500 };
  }
  if (!data?.length) {
    return { error: "会话不存在", status: 404 };
  }
  return { ok: true };
}

export async function deleteChatSession(
  userId: string,
  sessionId: string
): Promise<{ ok: true } | { error: string; status: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    return { error: error.message, status: 500 };
  }
  if (!data?.length) {
    return { error: "会话不存在", status: 404 };
  }
  return { ok: true };
}

export async function appendChatMessages(
  userId: string,
  sessionId: string,
  messages: PersistChatMessageInput[],
  options?: { titleFromFirstUser?: string }
): Promise<{ messages: ChatMessageRow[] } | { error: string; status: number }> {
  if (messages.length === 0) {
    return { messages: [] };
  }

  const admin = createAdminClient();
  const sessionResult = await admin
    .from("chat_sessions")
    .select("id, title")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (sessionResult.error || !sessionResult.data) {
    return { error: "会话不存在", status: 404 };
  }

  const { data: lastRow } = await admin
    .from("chat_messages")
    .select("sort_order")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextOrder = (lastRow?.sort_order ?? -1) + 1;

  const rows = [];
  for (const m of messages) {
    let mediaJson: ParsedGenerationMedia | null = null;
    if (m.media) {
      mediaJson = await resolveMediaForHistoryStorage(
        admin,
        userId,
        sessionId,
        m.media
      );
    }

    rows.push({
      session_id: sessionId,
      role: m.role,
      content: m.content,
      media_json: mediaJson,
      is_error: m.isError ?? false,
      sort_order: nextOrder,
    });
    nextOrder += 1;
  }

  const { data: inserted, error } = await admin
    .from("chat_messages")
    .insert(rows)
    .select(
      "id, session_id, role, content, media_json, is_error, sort_order, created_at"
    );

  if (error) {
    if (isMissingChatHistoryTable(error.message)) {
      return { error: CHAT_HISTORY_MIGRATION_HINT, status: 500 };
    }
    return { error: error.message, status: 500 };
  }

  const sessionUpdates: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };

  const currentTitle = sessionResult.data.title as string;
  const titleSource = options?.titleFromFirstUser?.trim();
  if (
    titleSource &&
    (currentTitle === "新对话" || !currentTitle.trim())
  ) {
    sessionUpdates.title = deriveTitle(titleSource);
  }

  await admin
    .from("chat_sessions")
    .update(sessionUpdates)
    .eq("id", sessionId)
    .eq("user_id", userId);

  return { messages: (inserted ?? []) as ChatMessageRow[] };
}
