export type GenerationMediaItem = {
  b64_json?: string;
  url?: string;
  uri?: string;
  mime_type?: string;
};

export type ParsedGenerationMedia = {
  kind: "image" | "video";
  items: GenerationMediaItem[];
};

const MIME_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export function parseGenerationResponse(
  data: unknown
): ParsedGenerationMedia | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.data) || obj.data.length === 0) return null;

  const kind: ParsedGenerationMedia["kind"] =
    obj.type === "video" ? "video" : "image";

  const items = obj.data
    .filter((entry): entry is GenerationMediaItem => {
      if (!entry || typeof entry !== "object") return false;
      const row = entry as GenerationMediaItem;
      return !!(row.b64_json || row.url || row.uri);
    })
    .map((entry) => ({ ...entry }));

  if (items.length === 0) return null;
  return { kind, items };
}

export function resolveMediaMime(
  item: GenerationMediaItem,
  kind: "image" | "video"
): string {
  if (item.mime_type) return item.mime_type;
  return kind === "video" ? "video/mp4" : "image/png";
}

export function extensionFromMime(mime: string): string {
  return MIME_EXTENSION[mime.toLowerCase()] ?? "bin";
}

export function mediaItemToPreviewSrc(
  item: GenerationMediaItem,
  kind: "image" | "video"
): string | null {
  if (item.b64_json) {
    const mime = resolveMediaMime(item, kind);
    return `data:${mime};base64,${item.b64_json}`;
  }
  if (item.uri && isGoogleGenerativeMediaUri(item.uri)) {
    return `/api/web/generations/media?uri=${encodeURIComponent(item.uri)}`;
  }
  return item.url ?? item.uri ?? null;
}

function isGoogleGenerativeMediaUri(uri: string): boolean {
  try {
    const host = new URL(uri).hostname;
    return host === "generativelanguage.googleapis.com";
  } catch {
    return false;
  }
}

export function isPublicMediaLink(url: string): boolean {
  return (
    isGoogleGenerativeMediaUri(url) ||
    url.includes("/storage/v1/object/public/chat-media/")
  );
}

export function mediaItemDownloadUrl(
  item: GenerationMediaItem,
  kind: "image" | "video",
  modelId: string,
  index: number
): string | null {
  void modelId;
  if (item.uri && isGoogleGenerativeMediaUri(item.uri)) {
    return `/api/web/generations/media?uri=${encodeURIComponent(item.uri)}&download=1`;
  }
  if (item.url) {
    return item.url;
  }
  return item.uri ?? null;
}

export function buildDownloadFilename(
  kind: "image" | "video",
  modelId: string,
  index: number,
  mime: string
): string {
  const ext = extensionFromMime(mime);
  const safeModel = modelId.replace(/[^\w.-]+/g, "-").slice(0, 48);
  return `yuhao-${kind}-${safeModel}-${index + 1}.${ext}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function base64ToBlob(b64: string, mime: string): Blob {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function downloadGenerationMedia(
  item: GenerationMediaItem,
  kind: "image" | "video",
  modelId: string,
  index = 0
): Promise<{ ok: true } | { ok: false; message: string }> {
  const mime = resolveMediaMime(item, kind);
  const filename = buildDownloadFilename(kind, modelId, index, mime);

  if (item.b64_json) {
    triggerBlobDownload(base64ToBlob(item.b64_json, mime), filename);
    return { ok: true };
  }

  const remoteUrl = item.url ?? item.uri;
  if (!remoteUrl) {
    return { ok: false, message: "没有可下载的媒体数据" };
  }

  if (item.uri && isGoogleGenerativeMediaUri(item.uri)) {
    const proxy = `/api/web/generations/media?uri=${encodeURIComponent(item.uri)}&download=1`;
    const anchor = document.createElement("a");
    anchor.href = proxy;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return { ok: true };
  }

  try {
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    triggerBlobDownload(blob, filename);
    return { ok: true };
  } catch {
    window.open(remoteUrl, "_blank", "noopener,noreferrer");
    return {
      ok: false,
      message: "无法直接下载，已在新窗口打开链接，请右键另存为",
    };
  }
}
