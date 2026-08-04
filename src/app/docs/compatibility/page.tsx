import { DocsSection, DocsShell } from "@/components/docs/docs-shell";
import Link from "next/link";

export const metadata = {
  title: "兼容说明 · 遇好API",
  description: "遇好API tools、流式输出、请求体大小与各厂商差异说明。",
};

export default function DocsCompatibilityPage() {
  return (
    <DocsShell
      pathname="/docs/compatibility"
      title="兼容说明"
      description="面向 Agent、工具调用与长上下文场景的接入须知。"
    >
      <DocsSection title="工具调用（tools）">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted">
              <tr>
                <th className="py-2 pr-4 font-medium">服务商</th>
                <th className="py-2 font-medium">支持情况</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">OpenAI 分组</td>
                <td className="py-2">
                  支持 tools、tool_choice、多轮 tool_calls
                </td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">DeepSeek 分组</td>
                <td className="py-2">OpenAI 兼容格式</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">Anthropic 分组</td>
                <td className="py-2">随请求体透传</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Google Gemini</td>
                <td className="py-2">
                  不支持客户端 tools / tool_choice（返回{" "}
                  <Link
                    href="/docs/errors#tools_not_supported"
                    className="text-accent-dark hover:underline"
                  >
                    tools_not_supported
                  </Link>
                  ）
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          预扣费会按 messages + tools + tool_choice 估算 prompt token
          并冻结余额；实际用量略高时结算会补扣差额。
        </p>
      </DocsSection>

      <DocsSection title="流式输出（stream）">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            OpenAI / DeepSeek 支持{" "}
            <code className="rounded bg-background px-1">stream: true</code>
            ，响应为 SSE（text/event-stream）。
          </li>
          <li>
            平台会附加{" "}
            <code className="rounded bg-background px-1">
              stream_options.include_usage: true
            </code>
            ，便于按真实 token 计费。
          </li>
          <li>若上游未返回 usage，将按预扣金额结算。</li>
          <li>Anthropic、Gemini 路径暂不支持流式透传。</li>
        </ul>
      </DocsSection>

      <DocsSection title="请求体大小">
        <p>
          单次{" "}
          <code className="rounded bg-background px-1">
            POST /v1/chat/completions
          </code>{" "}
          请求体上限约 <strong className="text-foreground">4 MB</strong>
          。超出返回 413 /{" "}
          <Link
            href="/docs/errors#payload_too_large"
            className="text-accent-dark hover:underline"
          >
            payload_too_large
          </Link>
          。
        </p>
        <p>
          常见原因：tools 过多、description / Schema 过长、多轮历史未裁剪。
        </p>
      </DocsSection>

      <DocsSection title="常见错误速查">
        <ul className="list-disc space-y-1 pl-5">
          <li>402 insufficient_quota — 余额不足</li>
          <li>413 payload_too_large — 请求体过大</li>
          <li>400 tools_not_supported — Gemini 不支持 tools</li>
          <li>500 billing_error — 结算异常（少见）</li>
        </ul>
        <p>
          完整列表见{" "}
          <Link href="/docs/errors" className="text-accent-dark hover:underline">
            错误码
          </Link>
          。
        </p>
      </DocsSection>
    </DocsShell>
  );
}
