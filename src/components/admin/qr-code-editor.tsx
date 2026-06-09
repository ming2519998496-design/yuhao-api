"use client";

import type {
  PaymentAccountItem,
  PaymentChannel,
  QrCodeMode,
} from "@/lib/payment-settings";
import { cn } from "@/lib/utils";
import { CheckCircle2, ImageIcon, Link2, Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
  channel: PaymentChannel;
  item: PaymentAccountItem;
  onChange: (patch: Partial<PaymentAccountItem>) => void;
  /** 自定义上传区提示文案 */
  uploadHint?: string;
};

export function QrCodeEditor({ channel, item, onChange, uploadHint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const previewUrl =
    item.qrCodeMode === "upload" ? item.qrCodeUploadUrl : item.qrCodeUrl;

  useEffect(() => {
    if (!uploadSuccess) return;
    const timer = setTimeout(() => setUploadSuccess(""), 8000);
    return () => clearTimeout(timer);
  }, [uploadSuccess]);

  function setMode(mode: QrCodeMode) {
    onChange({ qrCodeMode: mode });
    setUploadError("");
    setUploadSuccess("");
    setPendingFile(null);
  }

  async function handleUpload() {
    if (!pendingFile) {
      setUploadError("请先选择图片");
      setUploadSuccess("");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    const form = new FormData();
    form.append("file", pendingFile);
    form.append("channel", channel);

    try {
      const res = await fetch("/api/admin/settings/payment/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(data.error || "上传失败，请重试");
        return;
      }

      onChange({
        qrCodeMode: "upload",
        qrCodeUploadUrl: data.url,
        qrCodeUrl: "",
      });
      setPendingFile(null);
      setUploadSuccess("上传成功！请点击页面底部「保存收款设置」后对用户生效");
    } catch {
      setUploadError("上传失败，请检查网络后重试");
    } finally {
      setUploading(false);
    }
  }

  function handleFilePick(file: File) {
    setUploadError("");
    setUploadSuccess("");
    setPendingFile(file);
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs text-muted">收款码（二选一）</label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
            item.qrCodeMode === "upload"
              ? "border-accent bg-accent/10 text-accent-dark"
              : "border-border text-muted hover:border-border-hover"
          )}
        >
          <Upload className="h-3.5 w-3.5" />
          上传收款码
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
            item.qrCodeMode === "url"
              ? "border-accent bg-accent/10 text-accent-dark"
              : "border-border text-muted hover:border-border-hover"
          )}
        >
          <Link2 className="h-3.5 w-3.5" />
          图片链接
        </button>
      </div>

      {item.qrCodeMode === "upload" ? (
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFilePick(file);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-4 text-sm text-muted transition-colors hover:border-accent hover:bg-accent/5 disabled:opacity-50"
          >
            <ImageIcon className="h-4 w-4" />
            {uploadHint ?? "点击选择收款码图片（最大 2MB）"}
          </button>

          {pendingFile && (
            <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
              已选择：<span className="font-medium text-foreground">{pendingFile.name}</span>
              {" · "}
              {(pendingFile.size / 1024).toFixed(0)} KB
            </p>
          )}

          <button
            type="button"
            disabled={uploading || !pendingFile}
            onClick={() => void handleUpload()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-dark py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                上传
              </>
            )}
          </button>

          {uploadSuccess && (
            <p className="flex items-start gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {uploadSuccess}
            </p>
          )}

          {uploadError && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600">
              上传失败：{uploadError}
            </p>
          )}
        </div>
      ) : (
        <input
          value={item.qrCodeUrl}
          onChange={(e) =>
            onChange({ qrCodeUrl: e.target.value, qrCodeMode: "url" })
          }
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
          placeholder="https://example.com/qrcode.png"
        />
      )}

      {previewUrl && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background/50 p-3">
          <p className="text-xs text-muted">预览</p>
          <Image
            src={previewUrl}
            alt="收款码预览"
            width={160}
            height={160}
            className="rounded-lg border border-border object-contain"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}
