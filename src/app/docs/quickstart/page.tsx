import { ApiIntegrationSnippets } from "@/components/api/api-integration-snippets";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { getApiBaseUrl } from "@/lib/api-client-config";
import Link from "next/link";

export const metadata = {
  title: "快速开始 · 遇好API",
  description:
    "5 分钟接入遇好API：创建 Key、配置 Base URL，使用 OpenAI 兼容接口调用 GPT、Gemini、DeepSeek。",
};

export default function QuickstartPage() {
  const baseUrl =
    typeof process.env.NEXT_PUBLIC_SITE_URL === "string"
      ? getApiBaseUrl()
      : "https://yuhaoapi.com/v1";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28">
        <h1 className="text-3xl font-bold tracking-tight">快速开始</h1>
        <p className="mt-2 text-muted">
          OpenAI 兼容接口，只需替换 Base URL 与 API Key，现有 SDK 和 Cursor 均可直接使用。
        </p>

        <ol className="mt-10 space-y-8">
          <li className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
            <h2 className="text-lg font-semibold">1. 注册并创建 API Key</h2>
            <p className="mt-2 text-sm text-muted">
              新用户注册赠送 ¥1 体验金。登录后进入{" "}
              <Link href="/console?create=1" className="text-accent-dark hover:underline">
                令牌管理
              </Link>{" "}
              创建密钥，完整 <code className="rounded bg-background px-1">yh_...</code>{" "}
              内容仅显示一次，请立即复制保存。
            </p>
          </li>

          <li className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
            <h2 className="text-lg font-semibold">2. 在 Playground 验证</h2>
            <p className="mt-2 text-sm text-muted">
              打开{" "}
              <Link href="/playground" className="text-accent-dark hover:underline">
                API 调试
              </Link>
              ，粘贴密钥并发送测试请求，确认返回正常且余额扣费成功。
            </p>
          </li>

          <li className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
            <h2 className="text-lg font-semibold">3. 接入你的项目</h2>
            <p className="mt-2 text-sm text-muted">
              平台 Base URL（OpenAI 兼容）：
            </p>
            <code className="mt-3 block rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm">
              {baseUrl}
            </code>
            <p className="mt-4 text-sm text-muted">
              主要端点：<code className="rounded bg-background px-1">POST /v1/chat/completions</code>
              （对话）、
              <code className="rounded bg-background px-1">POST /v1/generations</code>
              （图像/视频）。请求头携带{" "}
              <code className="rounded bg-background px-1">Authorization: Bearer 你的Key</code>。
            </p>

            <div className="mt-6">
              <ApiIntegrationSnippets
                apiKey="你的_API_Key"
                model="gpt-4o-mini"
                title="代码示例（将 Key 替换为你的密钥）"
              />
            </div>
          </li>
        </ol>

        <div className="mt-10 rounded-2xl border border-accent/25 bg-accent/5 p-6">
          <h2 className="font-semibold">Cursor 配置要点</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
            <li>
              Settings → Models → OpenAI：填入 API Key，并开启 Override OpenAI Base URL
            </li>
            <li>Base URL 填 <span className="font-mono text-foreground">{baseUrl}</span></li>
            <li>Agent / 工具调用建议使用 GPT 或 DeepSeek 分组模型</li>
          </ul>
          <Link
            href="/register"
            className="mt-5 inline-flex rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            注册并开始
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
