"use client";

import {
  buildDownloadFilename,
  downloadGenerationMedia,
  mediaItemDownloadUrl,
  mediaItemToPreviewSrc,
  resolveMediaMime,
  type ParsedGenerationMedia,
} from "@/lib/generation-media";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";

type GenerationMediaPreviewProps = {
  media: ParsedGenerationMedia;
  modelId: string;
  className?: string;
};

function MediaItemCard({
  item,
  kind,
  modelId,
  index,
}: {
  item: ParsedGenerationMedia["items"][number];
  kind: ParsedGenerationMedia["kind"];
  modelId: string;
  index: number;
}) {
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const previewSrc = mediaItemToPreviewSrc(item, kind);
  const mime = resolveMediaMime(item, kind);
  const filename = buildDownloadFilename(kind, modelId, index, mime);
  const remoteUrl = item.url ?? item.uri;
  const openUrl = previewSrc ?? remoteUrl;

  async function handleDownload() {
    setDownloading(true);
    setNotice(null);

    const proxyUrl = mediaItemDownloadUrl(item, kind, modelId, index);
    if (proxyUrl) {
      const anchor = document.createElement("a");
      anchor.href = proxyUrl;
      anchor.rel = "noopener";
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setDownloading(false);
      return;
    }

    const result = await downloadGenerationMedia(item, kind, modelId, index);
    if (!result.ok) {
      setNotice(result.message);
    }
    setDownloading(false);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="border-b border-border bg-surface-elevated/40 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-muted">
            {kind === "video" ? "视频" : "图像"} #{index + 1}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {openUrl && (
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:bg-background hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                新窗口打开
              </a>
            )}
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={downloading}
              className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-accent to-accent-dark px-2.5 py-1 text-xs font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              下载
            </button>
          </div>
        </div>
        {notice && (
          <p className="mt-2 text-xs text-amber-700">{notice}</p>
        )}
      </div>

      <div className="p-3">
        {previewSrc ? (
          kind === "video" ? (
            <video
              src={previewSrc}
              controls
              playsInline
              className="mx-auto max-h-[28rem] w-full rounded-md bg-black object-contain"
            >
              您的浏览器不支持视频播放
            </video>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={previewSrc}
              alt={`生成结果 ${index + 1}`}
              className="mx-auto max-h-96 w-auto rounded-md object-contain"
            />
          )
        ) : (
          <p className="py-8 text-center text-sm text-muted">
            无法预览，请尝试下载或使用新窗口打开
          </p>
        )}
        <p className="mt-2 text-center text-xs text-muted">{filename}</p>
      </div>
    </div>
  );
}

export function GenerationMediaPreview({
  media,
  modelId,
  className,
}: GenerationMediaPreviewProps) {
  const label = media.kind === "video" ? "视频预览" : "图像预览";

  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm text-muted">{label}</label>
      <div className="space-y-4">
        {media.items.map((item, index) => (
          <MediaItemCard
            key={`${modelId}-${index}`}
            item={item}
            kind={media.kind}
            modelId={modelId}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
