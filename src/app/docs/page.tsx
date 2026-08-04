import { DocsSection, DocsShell, DOCS_NAV } from "@/components/docs/docs-shell";
import Link from "next/link";

export const metadata = {
  title: "开发者文档 · 遇好API",
  description:
    "遇好API 开发者文档：快速开始、API 参考、一键配置、错误码与兼容说明。",
};

export default function DocsIndexPage() {
  return (
    <DocsShell
      pathname="/docs"
      title="开发者文档"
      description="OpenAI 兼容接口：替换 Base URL 与 API Key 即可接入 GPT、Gemini、DeepSeek 等模型。"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {DOCS_NAV.filter((item) => item.href !== "/docs").map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm transition-colors hover:border-accent/40"
          >
            <h2 className="font-semibold text-foreground">{item.label}</h2>
            <p className="mt-2 text-sm text-muted">
              {item.href === "/docs/quickstart" &&
                "注册、创建 Key、5 分钟发出第一请求。"}
              {item.href === "/docs/api" &&
                "端点、鉴权、请求/响应格式与计费说明。"}
              {item.href === "/docs/integrations" &&
                "Cursor、Continue、LiteLLM、LangChain 等一键复制配置。"}
              {item.href === "/docs/errors" &&
                "稳定错误码、HTTP 状态与排查建议。"}
              {item.href === "/docs/compatibility" &&
                "tools、流式、请求体大小与各厂商差异。"}
            </p>
          </Link>
        ))}
      </div>

      <DocsSection title="接入三步">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            在{" "}
            <Link
              href="/console?create=1"
              className="text-accent-dark hover:underline"
            >
              令牌管理
            </Link>{" "}
            创建 API Key
          </li>
          <li>
            将客户端 Base URL 设为{" "}
            <code className="rounded bg-background px-1">
              https://你的域名/v1
            </code>
          </li>
          <li>
            用{" "}
            <Link href="/playground" className="text-accent-dark hover:underline">
              API 调试
            </Link>{" "}
            或 curl 验证，再拷贝{" "}
            <Link
              href="/docs/integrations"
              className="text-accent-dark hover:underline"
            >
              一键配置
            </Link>
          </li>
        </ol>
      </DocsSection>
    </DocsShell>
  );
}
