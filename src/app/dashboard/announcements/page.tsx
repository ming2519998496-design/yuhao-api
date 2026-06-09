"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { Announcement } from "@/lib/announcements-settings";
import { Megaphone, Pin } from "lucide-react";
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

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/announcements")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "加载失败");
        setItems(data.items ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell
      title="公告通知"
      description="平台最新动态与重要提醒"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        {loading && (
          <p className="text-sm text-muted">加载公告中...</p>
        )}
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface-elevated px-6 py-12 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-3 text-sm text-muted">暂无公告</p>
          </div>
        )}
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {item.pinned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent-dark">
                    <Pin className="h-3 w-3" />
                    置顶
                  </span>
                )}
                <h2 className="font-semibold text-foreground">{item.title}</h2>
              </div>
              <time
                className="shrink-0 text-xs text-muted"
                dateTime={item.publishedAt}
              >
                {formatDate(item.publishedAt)}
              </time>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {item.content}
            </p>
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}
