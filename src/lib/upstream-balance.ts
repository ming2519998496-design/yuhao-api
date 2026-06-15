import {
  isVercelAiGatewayBaseUrl,
  isVercelAiGatewayEnabled,
  VERCEL_AI_GATEWAY_BASE_URL,
} from "@/lib/upstream-gateway";
import {
  resolveUpstreamApiKeyMeta,
  type UpstreamKeySource,
} from "@/lib/upstream-keys-store";
import {
  UPSTREAM_PROVIDERS,
  type UpstreamProviderId,
} from "@/lib/upstream-keys-settings";
import { resolveUpstreamBaseUrl, upstreamFetch } from "@/lib/upstream-fetch";

export type UpstreamBalanceStatus =
  | "ok"
  | "low"
  | "unavailable"
  | "not_configured"
  | "unsupported"
  | "error";

export type UpstreamBalanceEntry = {
  provider: UpstreamProviderId;
  label: string;
  status: UpstreamBalanceStatus;
  message: string;
  balance?: string;
  currency?: string;
  totalUsed?: string;
  isAvailable?: boolean;
  detail?: string;
  keySource?: UpstreamKeySource;
  dashboardUrl?: string;
  checkedAt: string;
};

const GATEWAY_LOW_USD = 10;
const DEEPSEEK_LOW_CNY = 50;
const DEEPSEEK_LOW_USD = 5;

function nowIso(): string {
  return new Date().toISOString();
}

function entryBase(
  provider: UpstreamProviderId,
  label: string,
  keySource?: UpstreamKeySource
): Omit<UpstreamBalanceEntry, "status" | "message"> {
  return {
    provider,
    label,
    keySource,
    checkedAt: nowIso(),
  };
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

async function fetchVercelGatewayCredits(
  apiKey: string
): Promise<Omit<UpstreamBalanceEntry, "provider" | "label">> {
  const base = entryBase("openai", "OpenAI（Vercel AI Gateway）");
  const response = await upstreamFetch(`${VERCEL_AI_GATEWAY_BASE_URL}/credits`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  const data = (await readJsonResponse(response)) as {
    balance?: string | number;
    total_used?: string | number;
    error?: { message?: string };
  };

  if (!response.ok) {
    return {
      ...base,
      status: "error",
      message:
        data.error?.message ||
        `查询失败（HTTP ${response.status}）`,
      dashboardUrl: "https://vercel.com/dashboard/ai-gateway",
    };
  }

  const balanceNum = Number(data.balance ?? NaN);
  const totalUsed = data.total_used != null ? String(data.total_used) : undefined;
  const balance = Number.isFinite(balanceNum)
    ? balanceNum.toFixed(2)
    : String(data.balance ?? "—");

  let status: UpstreamBalanceStatus = "ok";
  let message = `剩余 $${balance}（累计已用 $${totalUsed ?? "—"}）`;
  if (Number.isFinite(balanceNum) && balanceNum <= 0) {
    status = "unavailable";
    message = "余额已用尽，请至 Vercel AI Gateway 充值";
  } else if (Number.isFinite(balanceNum) && balanceNum < GATEWAY_LOW_USD) {
    status = "low";
    message = `余额偏低（$${balance}），建议尽快充值`;
  }

  return {
    ...base,
    status,
    message,
    balance,
    currency: "USD",
    totalUsed,
    isAvailable: !Number.isFinite(balanceNum) || balanceNum > 0,
    dashboardUrl: "https://vercel.com/dashboard/ai-gateway",
  };
}

async function fetchDeepSeekBalance(
  apiKey: string
): Promise<Omit<UpstreamBalanceEntry, "provider" | "label">> {
  const base = entryBase("deepseek", "DeepSeek");
  const response = await upstreamFetch("https://api.deepseek.com/user/balance", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  const data = (await readJsonResponse(response)) as {
    is_available?: boolean;
    balance_infos?: Array<{
      currency?: string;
      total_balance?: string;
      granted_balance?: string;
      topped_up_balance?: string;
    }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    return {
      ...base,
      status: "error",
      message:
        data.error?.message ||
        `查询失败（HTTP ${response.status}）`,
      dashboardUrl: "https://platform.deepseek.com/top_up",
    };
  }

  const infos = data.balance_infos ?? [];
  const preferred =
    infos.find((i) => i.currency === "CNY") ??
    infos.find((i) => i.currency === "USD") ??
    infos[0];

  if (!preferred) {
    return {
      ...base,
      status: "error",
      message: "未返回余额信息",
      isAvailable: data.is_available,
      dashboardUrl: "https://platform.deepseek.com/top_up",
    };
  }

  const currency = preferred.currency ?? "CNY";
  const total = Number(preferred.total_balance ?? NaN);
  const granted = preferred.granted_balance ?? "0";
  const toppedUp = preferred.topped_up_balance ?? "0";
  const balance = Number.isFinite(total)
    ? total.toFixed(2)
    : String(preferred.total_balance ?? "—");

  let status: UpstreamBalanceStatus = data.is_available === false ? "unavailable" : "ok";
  let message = `剩余 ${currency} ${balance}`;

  if (data.is_available === false) {
    message = `余额不足（${currency} ${balance}），请充值`;
  } else if (currency === "CNY" && Number.isFinite(total) && total < DEEPSEEK_LOW_CNY) {
    status = "low";
    message = `余额偏低（${currency} ${balance}），建议尽快充值`;
  } else if (currency === "USD" && Number.isFinite(total) && total < DEEPSEEK_LOW_USD) {
    status = "low";
    message = `余额偏低（${currency} ${balance}），建议尽快充值`;
  }

  return {
    ...base,
    status,
    message,
    balance,
    currency,
    isAvailable: data.is_available,
    detail: `赠送 ${granted} · 充值 ${toppedUp}`,
    dashboardUrl: "https://platform.deepseek.com/top_up",
  };
}

async function fetchGoogleKeyHealth(
  apiKey: string
): Promise<Omit<UpstreamBalanceEntry, "provider" | "label">> {
  const base = entryBase("google", "Google Gemini");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=1`;

  const response = await upstreamFetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const data = (await readJsonResponse(response)) as {
    error?: { message?: string; status?: string };
  };

  if (!response.ok) {
    return {
      ...base,
      status: "error",
      message:
        data.error?.message ||
        `Key 校验失败（HTTP ${response.status}）`,
      dashboardUrl: "https://aistudio.google.com/apikey",
    };
  }

  return {
    ...base,
    status: "unsupported",
    message:
      "Key 有效。Google 未提供余额 API，配额按项目限流，请在 AI Studio 查看用量与充值",
    isAvailable: true,
    dashboardUrl: "https://aistudio.google.com/",
  };
}

async function fetchOpenAiBalance(
  apiKey: string,
  keySource: UpstreamKeySource
): Promise<Omit<UpstreamBalanceEntry, "provider" | "label">> {
  const openAiBase = resolveUpstreamBaseUrl("openai", "https://api.openai.com/v1");
  const usesGateway =
    isVercelAiGatewayEnabled() || isVercelAiGatewayBaseUrl(openAiBase);

  if (usesGateway) {
    return fetchVercelGatewayCredits(apiKey);
  }

  const base = entryBase("openai", "OpenAI");
  const response = await upstreamFetch(`${openAiBase.replace(/\/$/, "")}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return {
      ...base,
      status: "error",
      message: `Key 校验失败（HTTP ${response.status}）`,
      keySource,
      dashboardUrl: "https://platform.openai.com/settings/organization/billing",
    };
  }

  return {
    ...base,
    status: "unsupported",
    message:
      "Key 有效。直连 OpenAI 暂无余额查询 API，请至 OpenAI 控制台查看账单与充值",
    isAvailable: true,
    keySource,
    dashboardUrl: "https://platform.openai.com/settings/organization/billing",
  };
}

export async function fetchUpstreamBalance(
  provider: UpstreamProviderId
): Promise<UpstreamBalanceEntry> {
  const meta = await resolveUpstreamApiKeyMeta(provider);
  const providerMeta = UPSTREAM_PROVIDERS.find((p) => p.id === provider);
  const label = providerMeta?.label ?? provider;

  if (!meta.key) {
    return {
      ...entryBase(provider, label),
      status: "not_configured",
      message: "未配置 API Key",
    };
  }

  try {
    let result: Omit<UpstreamBalanceEntry, "provider" | "label">;
    if (provider === "openai") {
      result = await fetchOpenAiBalance(meta.key, meta.source);
    } else if (provider === "deepseek") {
      result = await fetchDeepSeekBalance(meta.key);
    } else {
      result = await fetchGoogleKeyHealth(meta.key);
    }

    return {
      provider,
      label,
      keySource: meta.source,
      ...result,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "查询失败";
    return {
      ...entryBase(provider, label, meta.source),
      status: "error",
      message: msg,
    };
  }
}

export async function fetchAllUpstreamBalances(): Promise<UpstreamBalanceEntry[]> {
  const results = await Promise.all(
    UPSTREAM_PROVIDERS.map(({ id }) => fetchUpstreamBalance(id))
  );
  return results;
}
