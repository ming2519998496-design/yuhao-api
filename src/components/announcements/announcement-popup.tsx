"use client";

import type { Announcement } from "@/lib/announcements-settings";
import {
  getSeenAnnouncementIds,
  markAnnouncementsSeen,
} from "@/lib/announcement-read";
import { Megaphone, Pin, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 登录后壳层挂载：有未读公告时弹窗，便于第一时间看到更新 */
export function AnnouncementPopup({
  userId,
  enabled = true,
}: {
  userId: string | null | undefined;
  enabled?: boolean;
}) {
  const pathname = usePathname();
  const [unread, setUnread] = useState<Announcement[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const skipOnListPage =
    pathname === "/dashboard/announcements" ||
    pathname.startsWith("/admin/settings/announcements");

  useEffect(() => {
    if (!enabled || !userId || skipOnListPage) return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/announcements");
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;

        const items = (data.items ?? []) as Announcement[];
        const seen = getSeenAnnouncementIds(userId!);
        const fresh = items.filter((item) => !seen.has(item.id));

        if (fresh.length === 0) return;
        setUnread(fresh);
        setActiveIndex(0);
        setOpen(true);
      } catch {
        // ignore network errors — list page still available
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled, userId, skipOnListPage]);

  function dismiss() {
    if (userId && unread.length > 0) {
      markAnnouncementsSeen(
        userId,
        unread.map((item) => item.id)
      );
    }
    setOpen(false);
    setUnread([]);
  }

  if (!open || unread.length === 0) return null;

  const current = unread[Math.min(activeIndex, unread.length - 1)];
  const hasMultiple = unread.length > 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-popup-title"
        className="relative z-10 flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-dark">
              <Megaphone className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-accent-dark">平台公告</p>
              <p
                id="announcement-popup-title"
                className="truncate text-base font-semibold text-foreground"
              >
                {hasMultiple
                  ? `有 ${unread.length} 条未读更新`
                  : "有新的平台动态"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1.5 text-muted hover:bg-accent/10 hover:text-foreground"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {current.pinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent-dark">
                  <Pin className="h-3 w-3" />
                  置顶
                </span>
              )}
              <h3 className="font-semibold text-foreground">{current.title}</h3>
            </div>
            <time
              className="shrink-0 text-xs text-muted"
              dateTime={current.publishedAt}
            >
              {formatDate(current.publishedAt)}
            </time>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {current.content}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {hasMultiple ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={activeIndex <= 0}
                onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-accent/5 disabled:opacity-40"
              >
                上一条
              </button>
              <span className="text-xs text-muted">
                {activeIndex + 1} / {unread.length}
              </span>
              <button
                type="button"
                disabled={activeIndex >= unread.length - 1}
                onClick={() =>
                  setActiveIndex((i) => Math.min(unread.length - 1, i + 1))
                }
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-accent/5 disabled:opacity-40"
              >
                下一条
              </button>
            </div>
          ) : (
            <span className="text-xs text-muted">关闭后本次不再弹出</span>
          )}
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link
              href="/dashboard/announcements"
              onClick={dismiss}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-accent/5 hover:text-foreground"
            >
              查看全部
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg bg-gradient-to-r from-accent to-accent-dark px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              我知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
