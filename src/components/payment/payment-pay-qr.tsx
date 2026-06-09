"use client";

import Image from "next/image";

type Props = {
  payUrl: string;
  alt?: string;
  size?: number;
  className?: string;
};

function isImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** 将支付链接（weixin://、alipays:// 或图片 URL）展示为可扫码的二维码 */
export function PaymentPayQr({
  payUrl,
  alt = "支付二维码",
  size = 320,
  className,
}: Props) {
  if (!payUrl) return null;

  if (isImageUrl(payUrl)) {
    return (
      <Image
        src={payUrl}
        alt={alt}
        width={size}
        height={size}
        className={className}
        unoptimized
      />
    );
  }

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payUrl)}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={qrSrc}
      alt={alt}
      width={size}
      height={size}
      className={className}
    />
  );
}
