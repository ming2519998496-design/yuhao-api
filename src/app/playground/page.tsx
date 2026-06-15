"use client";

import { getStoredModelId, setStoredModelId } from "@/components/models/model-catalog";
import {
  getPlaygroundApiKey,
  setPlaygroundApiKey,
} from "@/lib/playground-key";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type CatalogGroup = {
  category: { id: string; name: string };
  models: { id: string; name: string; apiKind?: string }[];
};

function PlaygroundContent() {
  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [model, setModel] = useState("gpt-4o-mini");
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("Say hello in Chinese");
  const [modelApiKind, setModelApiKind] = useState("chat");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [billingNote, setBillingNote] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = searchParams.get("model");
    const initialModel = fromQuery ?? getStoredModelId();
    setModel(initialModel);
    if (fromQuery) setStoredModelId(fromQuery);
    setApiKey(getPlaygroundApiKey());
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        const g = data.groups ?? [];
        setGroups(g);
        syncModelKind(g, initialModel);
      });
    fetch("/api/keys")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setLoggedIn(!!data?.keys))
      .catch(() => setLoggedIn(false));
  }, [searchParams]);

  function syncModelKind(groups: CatalogGroup[], modelId: string) {
    for (const group of groups) {
      const found = group.models.find((m) => m.id === modelId);
      if (found) {
        setModelApiKind(found.apiKind ?? "chat");
        return;
      }
    }
    setModelApiKind("chat");
  }

  function handleModelChange(nextModel: string) {
    setModel(nextModel);
    setStoredModelId(nextModel);
    let kind = "chat";
    for (const group of groups) {
      const found = group.models.find((m) => m.id === nextModel);
      if (found) {
        kind = found.apiKind ?? "chat";
        break;
      }
    }
    setModelApiKind(kind);
    if (kind !== "chat") {
      setPrompt("A cute cat sitting on a windowsill, watercolor style");
    }
  }

  function handleApiKeyChange(value: string) {
    setApiKey(value);
    setPlaygroundApiKey(value);
  }

  async function handleTest() {
    const key = apiKey.trim();
    if (!key) {
      setResponse(
        JSON.stringify(
          {
            error: {
              message:
                "请先填写 API Key（在令牌管理创建后复制完整 yh_... 密钥）",
              type: "auth_error",
            },
          },
          null,
          2
        )
      );
      return;
    }

    setLoading(true);
    setResponse("");
    setBillingNote("");
    setImagePreview(null);

    const isGeneration = modelApiKind !== "chat";

    try {
      const res = await fetch(
        isGeneration ? "/api/v1/generations" : "/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(
            isGeneration
              ? { model, prompt }
              : {
                  model,
                  messages: [{ role: "user", content: prompt }],
                  stream: false,
                }
          ),
        }
      );

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));

      const firstImage = data?.data?.[0];
      if (firstImage?.b64_json) {
        const mime = firstImage.mime_type || "image/png";
        setImagePreview(`data:${mime};base64,${firstImage.b64_json}`);
      } else if (firstImage?.url) {
        setImagePreview(firstImage.url);
      }

      const cost = res.headers.get("X-Yuhao-Billing-Cost-Cny");
      const balance = res.headers.get("X-Yuhao-Billing-Balance-Cny");
      if (cost && balance) {
        setBillingNote(
          `本次扣费 ¥${cost}，该 Key 剩余余额 ¥${balance}（已写入调用记录）`
        );
      } else if (res.status === 402) {
        setBillingNote("余额不足，请先到充值页充值并由管理员确认到账");
      } else if (res.status === 500 && data?.error?.type === "billing_error") {
        setBillingNote("计费失败，请确认已执行 supabase-billing-reserve.sql");
      }
    } catch (err) {
      setResponse(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">API 调试</h1>
        <p className="mt-1 text-sm text-muted">
          使用你的 API Key 测试对话接口（与正式调用方式一致）
        </p>

        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted">API Key</label>
            <input
              type="password"
              autoComplete="off"
              placeholder="yh_..."
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-accent/50"
            />
            <p className="mt-1.5 text-xs text-muted">
              {loggedIn ? (
                <>
                  已登录。完整密钥仅在创建时显示，请到{" "}
                  <Link href="/console" className="text-accent-dark hover:underline">
                    令牌管理
                  </Link>{" "}
                  复制；本页会记住本次输入（仅当前浏览器）。
                </>
              ) : (
                <>
                  请{" "}
                  <Link href="/login" className="text-accent-dark hover:underline">
                    登录
                  </Link>{" "}
                  后在令牌管理创建 Key，或粘贴已有密钥。
                </>
              )}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-muted">选择模型</label>
            <select
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/50"
            >
              {groups.map((g) => (
                <optgroup key={g.category.id} label={g.category.name}>
                  {g.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-muted">
              {modelApiKind === "chat" ? "测试提示词" : "生成描述（prompt）"}
            </label>
            {modelApiKind !== "chat" && (
              <p className="mb-2 text-xs text-muted">
                图像/视频模型走 /api/v1/generations；视频生成可能需要等待约 1–2 分钟
              </p>
            )}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          <button
            onClick={handleTest}
            disabled={loading}
            className="rounded-lg bg-gradient-to-r from-accent to-accent-dark px-6 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "请求中..." : "发送测试请求"}
          </button>

          {billingNote && (
            <p className="mt-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm text-accent-dark">
              {billingNote}
            </p>
          )}

          {imagePreview && (
            <div className="mt-4">
              <label className="mb-1.5 block text-sm text-muted">图像预览</label>
              <div className="overflow-hidden rounded-lg border border-border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="生成结果"
                  className="mx-auto max-h-96 w-auto rounded-md object-contain"
                />
              </div>
            </div>
          )}

          {response && (
            <div className="mt-4">
              <label className="mb-1.5 block text-sm text-muted">响应结果</label>
              <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-surface-elevated/50 p-4 text-sm">
                {response}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted">
          加载中...
        </div>
      }
    >
      <PlaygroundContent />
    </Suspense>
  );
}
