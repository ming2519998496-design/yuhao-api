"use client";

import QRCode from "qrcode";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  payUrl: string;
  alt?: string;
  size?: number;
  className?: string;
};

/** 可直接用 img 展示的图片地址（CSP 允许 data: 与同域/Supabase） */
function isDirectImageUrl(url: string): boolean {
  if (url.startsWith("data:image/")) return true;
  return /^https:\/\/[^/]*supabase\.co\/.+\.(png|jpe?g|webp|gif)(\?|$)/i.test(
    url
  );
}

/**
 * 将支付链接（weixin://、alipays:// 或 https 支付页）展示为可扫码二维码。
 * 在浏览器本地生成 data URL，避免 CSP 拦截第三方 qrserver 图床。
 */
export function PaymentPayQr({
  payUrl,
  alt = "支付二维码",
  size = 320,
  className,
}: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payUrl) return;

    if (isDirectImageUrl(payUrl)) {
      setQrDataUrl(payUrl.startsWith("data:") ? payUrl : null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setQrDataUrl(null);

    QRCode.toDataURL(payUrl, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("二维码生成失败，请关闭后重试");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [payUrl, size]);

  if (!payUrl) return null;

  if (isDirectImageUrl(payUrl) && !payUrl.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={payUrl}
        alt={alt}
        width={size}
        height={size}
        className={className}
      />
    );
  }

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-50 ${className ?? ""}`}
        style={{ width: size, height: size }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden />
        <span className="sr-only">生成二维码中</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="px-4 text-center text-sm text-red-500" style={{ maxWidth: size }}>
        {error}
      </p>
    );
  }

  if (!qrDataUrl) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={qrDataUrl}
      alt={alt}
      width={size}
      height={size}
      className={className}
    />
  );
}
