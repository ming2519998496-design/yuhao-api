"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Props = {
  primaryUrl?: string;
  backupUrl?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
};

/** 收款码：优先数据库 URL，加载失败时自动切换 Storage 备选 URL */
export function PaymentQrImage({
  primaryUrl,
  backupUrl,
  alt,
  width = 160,
  height = 160,
  className,
}: Props) {
  const [src, setSrc] = useState(primaryUrl ?? "");
  const [usedBackup, setUsedBackup] = useState(false);

  useEffect(() => {
    setSrc(primaryUrl ?? "");
    setUsedBackup(false);
  }, [primaryUrl, backupUrl]);

  if (!primaryUrl && !backupUrl) return null;

  const displaySrc = src || backupUrl || primaryUrl || "";

  return (
    <div className="flex flex-col items-center gap-1">
      <Image
        src={displaySrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        unoptimized
        onError={() => {
          if (!usedBackup && backupUrl && src !== backupUrl) {
            setSrc(backupUrl);
            setUsedBackup(true);
          }
        }}
      />
      {usedBackup && (
        <p className="text-[10px] text-amber-700">主图不可用，已切换备用收款码</p>
      )}
    </div>
  );
}
