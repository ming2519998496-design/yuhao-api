export type PaymentChannel = "alipay" | "wechat" | "combined";

export const PAYMENT_CHANNELS: PaymentChannel[] = [
  "combined",
  "alipay",
  "wechat",
];

export const PAYMENT_CHANNEL_LABELS: Record<PaymentChannel, string> = {
  combined: "二码合一",
  alipay: "支付宝",
  wechat: "微信支付",
};

export function getPaymentMethodLabel(method: string): string {
  if (method in PAYMENT_CHANNEL_LABELS) {
    return PAYMENT_CHANNEL_LABELS[method as PaymentChannel];
  }
  return method;
}

export type QrCodeMode = "url" | "upload";

export type PaymentAccountItem = {
  enabled: boolean;
  accountName: string;
  accountNo: string;
  /** 收款码来源：图片链接 或 上传图片 */
  qrCodeMode: QrCodeMode;
  /** 图片链接方式 */
  qrCodeUrl: string;
  /** 上传方式（Supabase Storage 公网地址） */
  qrCodeUploadUrl: string;
  note: string;
};

export type PaymentAccountsConfig = {
  /** 二码合一：一张收款码同时支持支付宝 / 微信 */
  combined: PaymentAccountItem;
  alipay: PaymentAccountItem;
  wechat: PaymentAccountItem;
};

const emptyChannel = (): PaymentAccountItem => ({
  enabled: false,
  accountName: "",
  accountNo: "",
  qrCodeMode: "url",
  qrCodeUrl: "",
  qrCodeUploadUrl: "",
  note: "",
});

export const DEFAULT_PAYMENT_ACCOUNTS: PaymentAccountsConfig = {
  combined: emptyChannel(),
  alipay: emptyChannel(),
  wechat: emptyChannel(),
};

function normalizeChannel(
  partial: Partial<PaymentAccountItem> | undefined
): PaymentAccountItem {
  const base = emptyChannel();
  if (!partial) return base;

  const merged = { ...base, ...partial };
  const mode: QrCodeMode =
    merged.qrCodeMode === "upload" || merged.qrCodeMode === "url"
      ? merged.qrCodeMode
      : merged.qrCodeUploadUrl
        ? "upload"
        : "url";

  return {
    ...merged,
    qrCodeMode: mode,
    qrCodeUrl: merged.qrCodeUrl ?? "",
    qrCodeUploadUrl: merged.qrCodeUploadUrl ?? "",
  };
}

export function mergePaymentAccounts(
  raw: unknown
): PaymentAccountsConfig {
  if (!raw || typeof raw !== "object") {
    return structuredClone(DEFAULT_PAYMENT_ACCOUNTS);
  }

  const obj = raw as Record<string, Partial<PaymentAccountItem>>;
  return {
    combined: normalizeChannel(obj.combined),
    alipay: normalizeChannel(obj.alipay),
    wechat: normalizeChannel(obj.wechat),
  };
}

/** 按当前模式解析前台展示的收款码地址 */
export function resolveQrCodeUrl(item: PaymentAccountItem): string {
  if (item.qrCodeMode === "upload") return item.qrCodeUploadUrl.trim();
  return item.qrCodeUrl.trim();
}

/** 保存前按二选一清理另一项 */
export function sanitizePaymentAccounts(
  config: PaymentAccountsConfig
): PaymentAccountsConfig {
  const next = structuredClone(config);
  for (const key of PAYMENT_CHANNELS) {
    const ch = next[key];
    if (ch.qrCodeMode === "upload") {
      ch.qrCodeUrl = "";
    } else {
      ch.qrCodeUploadUrl = "";
    }
  }
  return next;
}

/** 用户充值页展示的公开字段（含 Storage 备选收款码 URL） */
export type PublicPaymentAccount = {
  enabled: boolean;
  accountName?: string;
  accountNo?: string;
  qrCodeUrl?: string;
  /** 主图加载失败时使用（来自 Storage 备份配置） */
  qrCodeBackupUrl?: string;
};

export function pickQrBackupUrl(
  primary: PaymentAccountItem,
  backup: PaymentAccountItem | undefined
): string | undefined {
  if (!backup) return undefined;
  const primaryUrl = resolveQrCodeUrl(primary);
  const backupUrl = resolveQrCodeUrl(backup);
  if (!backupUrl || backupUrl === primaryUrl) return undefined;
  return backupUrl;
}

/** 用户充值页展示的公开字段 */
export function toPublicPaymentConfig(
  config: PaymentAccountsConfig,
  backupConfig?: PaymentAccountsConfig | null
) {
  const pick = (channel: PaymentChannel) => {
    const item = config[channel];
    if (!item.enabled) {
      return { enabled: false as const };
    }
    const qrCodeUrl = resolveQrCodeUrl(item);
    const qrCodeBackupUrl = pickQrBackupUrl(
      item,
      backupConfig?.[channel]
    );
    return {
      enabled: true as const,
      accountName: item.accountName,
      accountNo: item.accountNo,
      ...(qrCodeUrl ? { qrCodeUrl } : {}),
      ...(qrCodeBackupUrl ? { qrCodeBackupUrl } : {}),
    };
  };

  return {
    combined: pick("combined"),
    alipay: pick("alipay"),
    wechat: pick("wechat"),
  };
}
