import { DocsSection, DocsShell } from "@/components/docs/docs-shell";
import { getApiBaseUrl } from "@/lib/api-client-config";
import Link from "next/link";

export const metadata = {
  title: "API 参考 · 遇好API",
  description:
    "遇好API 开放接口：鉴权、chat/completions、generations、模型目录与计费。",
};

export default function DocsApiPage() {
  const baseUrl =
    typeof process.env.NEXT_PUBLIC_SITE_URL === "string"
      ? getApiBaseUrl()
      : "https://yuhaoapi.com/v1";

  return (
    <DocsShell
      pathname="/docs/api"
      title="API 参考"
      description="对外开放接口兼容 OpenAI Chat Completions；图像/视频走统一 generations 端点。"
    >
      <DocsSection title="Base URL 与鉴权">
        <p>
          Base URL：
          <code className="ml-1 rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
            {baseUrl}
          </code>
        </p>
        <p>
          所有 <code className="rounded bg-background px-1">/v1/*</code>{" "}
          请求需携带：
        </p>
        <pre className="overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-xs">{`Authorization: Bearer yh_你的密钥`}</pre>
        <p>
          Key 在{" "}
          <Link href="/console" className="text-accent-dark hover:underline">
            令牌管理
          </Link>{" "}
          创建；完整密钥仅显示一次。
        </p>
      </DocsSection>

      <DocsSection title="POST /v1/chat/completions">
        <p>对话补全（OpenAI 兼容）。主要字段：</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <code className="rounded bg-background px-1">model</code> — 模型
            id（见价目或公开目录）
          </li>
          <li>
            <code className="rounded bg-background px-1">messages</code> —
            多轮消息
          </li>
          <li>
            <code className="rounded bg-background px-1">stream</code> —
            可选；OpenAI / DeepSeek 支持 SSE
          </li>
          <li>
            <code className="rounded bg-background px-1">tools</code> /{" "}
            <code className="rounded bg-background px-1">tool_choice</code> —
            Agent 工具调用（Gemini 不支持，见兼容说明）
          </li>
        </ul>
        <p>
          计费：按 token 预扣 → 上游成功后按实际用量结算。余额不足返回{" "}
          <Link
            href="/docs/errors#insufficient_quota"
            className="text-accent-dark hover:underline"
          >
            insufficient_quota
          </Link>
          。
        </p>
      </DocsSection>

      <DocsSection title="POST /v1/generations">
        <p>图像 / 视频生成。请求体需指定对应生成类 model，以及提示词等参数。</p>
        <p>
          对话模型请勿调用此端点（会返回{" "}
          <Link
            href="/docs/errors#wrong_api_kind"
            className="text-accent-dark hover:underline"
          >
            wrong_api_kind
          </Link>
          ）。
        </p>
      </DocsSection>

      <DocsSection title="GET /api/models">
        <p>
          公开模型目录（按厂商分组，含价格提示）。无需 API Key，但受公开访问限流保护。
        </p>
        <p>
          浏览器价目页：{" "}
          <Link href="/pricing" className="text-accent-dark hover:underline">
            /pricing
          </Link>
          。
        </p>
      </DocsSection>

      <DocsSection title="相关文档">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <Link
              href="/docs/quickstart"
              className="text-accent-dark hover:underline"
            >
              快速开始
            </Link>
          </li>
          <li>
            <Link
              href="/docs/integrations"
              className="text-accent-dark hover:underline"
            >
              一键配置
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
              兼容说明
            </Link>
          </li>
        </ul>
      </DocsSection>
    </DocsShell>
  );
}
