"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import {
  EMPTY_UPSTREAM_KEYS,
  UPSTREAM_PROVIDERS,
  type UpstreamKeysConfig,
} from "@/lib/upstream-keys-settings";
import { Eye, EyeOff, KeyRound, Lock, RefreshCw, Save, ShieldAlert, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type UpstreamBalanceStatus =
  | "ok"
  | "low"
  | "unavailable"
  | "not_configured"
  | "unsupported"
  | "error";

type BalanceEntry = {
  provider: string;
  label: string;
  status: UpstreamBalanceStatus;
  message: string;
  balance?: string;
  currency?: string;
  totalUsed?: string;
  detail?: string;
  dashboardUrl?: string;
  checkedAt: string;
};

function balanceStatusClass(status: UpstreamBalanceStatus): string {
  switch (status) {
    case "ok":
      return "border-emerald-500/30 bg-emerald-500/5";
    case "low":
      return "border-amber-500/40 bg-amber-500/10";
    case "unavailable":
    case "error":
      return "border-red-500/30 bg-red-500/5";
    case "unsupported":
      return "border-sky-500/30 bg-sky-500/5";
    default:
      return "border-border bg-background";
  }
}

function balanceStatusLabel(status: UpstreamBalanceStatus): string {
  switch (status) {
    case "ok":
      return "正常";
    case "low":
      return "偏低";
    case "unavailable":
      return "不可用";
    case "not_configured":
      return "未配置";
    case "unsupported":
      return "需手动查看";
    case "error":
      return "查询失败";
    default:
      return status;
  }
}

type PublicView = {
  masked: UpstreamKeysConfig;
  configured: Record<string, boolean>;
  envFallback: Record<string, boolean>;
  updatedAt: string | null;
};

export default function AdminUpstreamKeysPage() {
  const [view, setView] = useState<PublicView | null>(null);
  const [keys, setKeys] = useState<UpstreamKeysConfig>({ ...EMPTY_UPSTREAM_KEYS });
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showKeyFields, setShowKeyFields] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState("");
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceCheckedAt, setBalanceCheckedAt] = useState<string | null>(null);

  const loadBalances = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const res = await fetch("/api/admin/settings/upstream-keys/balance");
      const data = await res.json();
      if (res.ok) {
        setBalances(data.balances ?? []);
        setBalanceCheckedAt(data.checkedAt ?? null);
      }
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings/upstream-keys");
    const data = await res.json();
    if (res.ok) {
      setView({
        masked: data.masked,
        configured: data.configured,
        envFallback: data.envFallback,
        updatedAt: data.updatedAt,
      });
    }
    setLoading(false);
    return data;
  }, []);

  useEffect(() => {
    void load();
    void loadBalances();
  }, [load, loadBalances]);

  function lockView() {
    setUnlocked(false);
    setPassword("");
    setKeys({ ...EMPTY_UPSTREAM_KEYS });
    setShowKeyFields({});
  }

  async function handleUnlock() {
    if (!password.trim()) {
      setMessage("请输入管理员登录密码");
      return;
    }
    setActing(true);
    setMessage("");
    const res = await fetch("/api/admin/settings/upstream-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setActing(false);
    if (!res.ok) {
      setMessage(data.error || "密码验证失败");
      return;
    }
    setKeys(data.keys ?? { ...EMPTY_UPSTREAM_KEYS });
    setUnlocked(true);
    setMessage("已解锁。离开本页或点击「锁定」后将隐藏完整密钥。");
  }

  async function handleSave() {
    if (!password.trim()) {
      setMessage("保存前请输入管理员登录密码");
      return;
    }
    setActing(true);
    setMessage("");
    const res = await fetch("/api/admin/settings/upstream-keys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, keys }),
    });
    const data = await res.json();
    setActing(false);
    if (!res.ok) {
      setMessage(data.error || "保存失败");
      return;
    }
    setView({
      masked: data.masked,
      configured: data.configured,
      envFallback: data.envFallback,
      updatedAt: data.updatedAt,
    });
    setKeys(data.masked ?? keys);
    setUnlocked(false);
    setPassword("");
    setShowKeyFields({});
    const tails = data.keyTails as Record<string, string | null> | undefined;
    const tailNote = tails
      ? Object.entries(tails)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k} ${v}`)
          .join(" · ")
      : "";
    setMessage(
      tailNote ? `${data.message ?? "保存成功"}（${tailNote}）` : (data.message ?? "保存成功")
    );
  }

  function updateKey(id: keyof UpstreamKeysConfig, value: string) {
    setKeys((prev) => ({ ...prev, [id]: value }));
  }

  return (
    <AdminShell
      title="上游 API Key"
      description="配置 OpenAI / Gemini / DeepSeek 等厂商密钥；查看与保存均需验证管理员密码"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <ShieldAlert className="h-4 w-4" />
            安全说明
          </div>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted">
            <li>完整密钥不会在未验证密码时展示或写入前端缓存</li>
            <li>
              后台保存的配置<strong className="font-medium text-foreground">优先于</strong>{" "}
              <code className="rounded bg-background px-1">.env.local</code>；修改 OpenAI Key
              请在本页保存，改 .env 不会覆盖后台已存 Key
            </li>
            <li>保存后<strong className="font-medium text-foreground">立即生效</strong>，无需重启 dev 服务</li>
            <li>留空并保存可清除对应厂商的后台配置（之后将回退到 .env）</li>
          </ul>
        </div>

        {loading ? (
          <p className="text-sm text-muted">加载中...</p>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-semibold">
                    <Wallet className="h-5 w-5 text-accent" />
                    上游余额 / 状态
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    DeepSeek 与 Vercel AI Gateway 可实时查余额；Gemini 仅校验 Key 有效，配额请至 AI Studio 查看。
                    {balanceCheckedAt && (
                      <>
                        {" "}
                        最近查询：
                        {new Date(balanceCheckedAt).toLocaleString("zh-CN")}
                      </>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={balanceLoading}
                  onClick={() => void loadBalances()}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-accent/5 hover:text-foreground disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${balanceLoading ? "animate-spin" : ""}`}
                  />
                  {balanceLoading ? "查询中..." : "刷新余额"}
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {balances.map((item) => (
                  <div
                    key={item.provider}
                    className={`rounded-xl border p-4 ${balanceStatusClass(item.status)}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted">
                        {balanceStatusLabel(item.status)}
                      </span>
                    </div>
                    {item.balance && item.currency && (
                      <p className="mt-2 text-lg font-semibold tabular-nums">
                        {item.currency === "USD" ? "$" : ""}
                        {item.balance}
                        {item.currency !== "USD" ? ` ${item.currency}` : ""}
                      </p>
                    )}
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {item.message}
                    </p>
                    {item.detail && (
                      <p className="mt-1 text-[11px] text-muted">{item.detail}</p>
                    )}
                    {item.totalUsed && (
                      <p className="mt-1 text-[11px] text-muted">
                        累计已用 ${item.totalUsed}
                      </p>
                    )}
                    {item.dashboardUrl && (
                      <a
                        href={item.dashboardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
                      >
                        前往充值 / 控制台 →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold">
              <KeyRound className="h-5 w-5 text-accent" />
              厂商密钥
            </h2>
            {view?.updatedAt && (
              <p className="mt-1 text-xs text-muted">
                最近更新：{new Date(view.updatedAt).toLocaleString("zh-CN")}
              </p>
            )}

            <div className="mt-5 space-y-5">
              {UPSTREAM_PROVIDERS.map(({ id, label, envVar, hint }) => {
                const configured = view?.configured[id];
                const envOnly = !configured && view?.envFallback[id];
                const displayValue = unlocked
                  ? keys[id]
                  : view?.masked[id] ?? "";

                return (
                  <div key={id}>
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <label className="text-sm font-medium">{label}</label>
                      {configured ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          后台已配置
                        </span>
                      ) : envOnly ? (
                        <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                          使用 .env
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] font-medium text-muted">
                          未配置
                        </span>
                      )}
                    </div>
                    <p className="mb-2 text-xs text-muted">
                      {hint} · 环境变量 <code className="rounded bg-background px-1">{envVar}</code>
                    </p>
                    <div className="relative">
                      <input
                        type={showKeyFields[id] ? "text" : "password"}
                        value={displayValue}
                        readOnly={!unlocked}
                        onChange={(e) => updateKey(id, e.target.value)}
                        placeholder={unlocked ? "粘贴 API Key，留空则清除" : "验证密码后可查看与编辑"}
                        className="w-full rounded-lg border border-border bg-background py-2.5 pl-3 pr-10 font-mono text-sm outline-none focus:ring-2 focus:ring-accent/50 read-only:cursor-not-allowed read-only:bg-zinc-500/5"
                      />
                      {unlocked && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowKeyFields((s) => ({ ...s, [id]: !s[id] }))
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
                          aria-label={showKeyFields[id] ? "隐藏" : "显示"}
                        >
                          {showKeyFields[id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </>
        )}

        <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Lock className="h-4 w-4 text-accent" />
            管理员密码验证
          </h3>
          <p className="mt-1 text-xs text-muted">
            查看完整密钥或保存修改时，须输入当前管理员账户的登录密码。
          </p>
          <div className="relative mt-3">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="管理员登录密码"
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {!unlocked ? (
              <button
                type="button"
                disabled={acting}
                onClick={() => void handleUnlock()}
                className="rounded-xl bg-gradient-to-r from-accent to-accent-dark px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:brightness-110 disabled:opacity-50"
              >
                {acting ? "验证中..." : "验证密码并查看"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void handleSave()}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-dark px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:brightness-110 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {acting ? "保存中..." : "保存配置"}
                </button>
                <button
                  type="button"
                  onClick={lockView}
                  className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-accent/5 hover:text-foreground"
                >
                  锁定并隐藏
                </button>
              </>
            )}
          </div>
        </div>

        {message && (
          <p
            className={`text-sm ${
              message.includes("失败") || message.includes("错误")
                ? "text-red-500"
                : "text-emerald-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </AdminShell>
  );
}
