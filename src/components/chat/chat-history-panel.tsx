"use client";

import type { ChatSessionSummary } from "@/lib/chat-history-client";
import { formatSessionTime } from "@/lib/chat-history-client";
import { modeLabel, type ChatMode } from "@/lib/chat-models";
import { cn } from "@/lib/utils";
import { History, Loader2, Trash2 } from "lucide-react";

type ChatHistoryPanelProps = {
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  loading: boolean;
  loadingSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
};

function modeBadge(mode: ChatMode): string {
  if (mode === "image") return "图";
  if (mode === "video") return "视";
  return "聊";
}

export function ChatHistoryPanel({
  sessions,
  activeSessionId,
  loading,
  loadingSessionId,
  onSelect,
  onDelete,
}: ChatHistoryPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated/60 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
        <History className="h-3.5 w-3.5" />
        历史记录
      </div>
      <p className="mb-2 text-[11px] leading-relaxed text-muted/90">
        历史聊天信息仅保留 30 天，到期将自动清理。
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-xs text-muted">
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          加载中…
        </div>
      ) : sessions.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">暂无保存的对话</p>
      ) : (
        <ul className="max-h-56 space-y-1 overflow-y-auto pr-0.5">
          {sessions.map((session) => {
            const active = session.id === activeSessionId;
            const busy = loadingSessionId === session.id;
            return (
              <li key={session.id}>
                <div
                  className={cn(
                    "group flex items-start gap-1 rounded-lg border px-2 py-2 transition-colors",
                    active
                      ? "border-accent/50 bg-accent/10"
                      : "border-transparent hover:border-border hover:bg-background"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(session.id)}
                    disabled={busy}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0 rounded bg-background px-1 py-0.5 text-[10px] text-muted">
                        {modeBadge(session.mode)}
                      </span>
                      <span className="truncate text-xs font-medium text-foreground">
                        {session.title}
                      </span>
                      {busy && (
                        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted" />
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {session.preview || modeLabel(session.mode)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted/80">
                      {formatSessionTime(session.updated_at)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(session.id);
                    }}
                    className="shrink-0 rounded p-1 text-muted opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    title="删除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
