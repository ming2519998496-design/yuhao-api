import type { ChatMode } from "@/lib/chat-models";
import type { ParsedGenerationMedia } from "@/lib/generation-media";

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

export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  media_json: ParsedGenerationMedia | null;
  is_error: boolean;
  sort_order: number;
  created_at: string;
};

export type ChatSessionDetail = {
  session: {
    id: string;
    title: string;
    mode: ChatMode;
    model_id: string;
    api_key_id: string | null;
    created_at: string;
    updated_at: string;
  };
  messages: StoredChatMessage[];
};

async function parseJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export async function fetchChatSessions(): Promise<{
  sessions: ChatSessionSummary[];
  error?: string;
}> {
  const res = await fetch("/api/chat/sessions", { credentials: "include" });
  const data = await parseJson<{ sessions?: ChatSessionSummary[]; error?: string }>(
    res
  );
  if (!res.ok) {
    return { sessions: [], error: data.error ?? "加载历史失败" };
  }
  return { sessions: data.sessions ?? [] };
}

export async function createChatSessionRemote(input: {
  mode: ChatMode;
  modelId: string;
  apiKeyId: string;
  title?: string;
}): Promise<{ sessionId: string } | { error: string }> {
  const res = await fetch("/api/chat/sessions", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: input.mode,
      modelId: input.modelId,
      apiKeyId: input.apiKeyId,
      title: input.title,
    }),
  });
  const data = await parseJson<{ session?: { id: string }; error?: string }>(res);
  if (!res.ok || !data.session?.id) {
    return { error: data.error ?? "创建会话失败" };
  }
  return { sessionId: data.session.id };
}

export async function fetchChatSession(
  sessionId: string
): Promise<{ detail: ChatSessionDetail } | { error: string }> {
  const res = await fetch(`/api/chat/sessions/${sessionId}`, {
    credentials: "include",
  });
  const data = await parseJson<ChatSessionDetail & { error?: string }>(res);
  if (!res.ok || !data.session) {
    return { error: data.error ?? "加载会话失败" };
  }
  return {
    detail: {
      session: data.session,
      messages: data.messages ?? [],
    },
  };
}

export async function deleteChatSessionRemote(
  sessionId: string
): Promise<{ ok: true } | { error: string }> {
  const res = await fetch(`/api/chat/sessions/${sessionId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await parseJson<{ error?: string }>(res);
  if (!res.ok) {
    return { error: data.error ?? "删除失败" };
  }
  return { ok: true };
}

export async function appendChatMessagesRemote(
  sessionId: string,
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    media?: ParsedGenerationMedia | null;
    isError?: boolean;
  }>,
  titleFromFirstUser?: string
): Promise<{ ok: true } | { error: string }> {
  const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, titleFromFirstUser }),
  });
  const data = await parseJson<{ error?: string }>(res);
  if (!res.ok) {
    return { error: data.error ?? "保存消息失败" };
  }
  return { ok: true };
}

export function formatSessionTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
