"use client";

import { useState } from "react";

const MODELS = [
  { id: "gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "deepseek-chat", label: "DeepSeek V4" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
];

export default function PlaygroundPage() {
  const [model, setModel] = useState("gpt-4o-mini");
  const [prompt, setPrompt] = useState("Say hello in Chinese");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleTest() {
    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        }),
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
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
          测试遇好API 代理路由是否正常工作
        </p>

        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted">选择模型</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/50"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-muted">测试提示词</label>
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
