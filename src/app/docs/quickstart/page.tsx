import { ApiIntegrationSnippets } from "@/components/api/api-integration-snippets";
import { DocsSection, DocsShell } from "@/components/docs/docs-shell";
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
    <DocsShell
      pathname="/docs/quickstart"
      title="快速开始"
      description="OpenAI 兼容接口，只需替换 Base URL 与 API Key，现有 SDK 和 Cursor 均可直接使用。"
    >
      <DocsSection title="1. 注册并创建 API Key">
        <p>
          新用户注册赠送体验金。登录后进入{" "}
          <Link
            href="/console?create=1"
            className="text-accent-dark hover:underline"
          >
            令牌管理
          </Link>{" "}
          创建密钥，完整{" "}
          <code className="rounded bg-background px-1">yh_...</code>{" "}
          内容仅显示一次，请立即复制保存。
        </p>
      </DocsSection>

      <DocsSection title="2. 在 Playground 验证">
        <p>
          打开{" "}
          <Link href="/playground" className="text-accent-dark hover:underline">
            API 调试
          </Link>
          ，粘贴密钥并发送测试请求，确认返回正常且余额扣费成功。
        </p>
      </DocsSection>

      <DocsSection title="3. 接入你的项目">
        <p>平台 Base URL（OpenAI 兼容）：</p>
        <code className="mt-2 block rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm text-foreground">
          {baseUrl}
        </code>
        <p className="mt-3">
          主要端点：
          <code className="rounded bg-background px-1">
            POST /v1/chat/completions
          </code>
          （对话）、
          <code className="rounded bg-background px-1">POST /v1/generations</code>
          （图像/视频）。请求头携带{" "}
          <code className="rounded bg-background px-1">
            Authorization: Bearer 你的Key
          </code>
          。
        </p>
        <div className="mt-4">
          <ApiIntegrationSnippets
            apiKey="你的_API_Key"
            model="gpt-4o-mini"
            title="代码示例（将 Key 替换为你的密钥）"
          />
        </div>
        <p className="mt-4">
          需要 Cursor、Continue、LiteLLM、LangChain 等完整配置？前往{" "}
          <Link
            href="/docs/integrations"
            className="font-medium text-accent-dark hover:underline"
          >
            一键配置
          </Link>
          。
        </p>
      </DocsSection>

      <DocsSection title="下一步">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <Link href="/docs/api" className="text-accent-dark hover:underline">
              API 参考
            </Link>
          </li>
          <li>
            <Link href="/docs/errors" className="text-accent-dark hover:underline">
              错误码
            </Link>
          </li>
          <li>
            <Link
              href="/docs/compatibility"
              className="text-accent-dark hover:underline"
            >
              兼容说明（tools / 流式）
            </Link>
          </li>
          <li>
            <Link href="/register" className="text-accent-dark hover:underline">
              注册并开始
            </Link>
          </li>
        </ul>
      </DocsSection>
    </DocsShell>
  );
}
