import { DocsSection, DocsShell } from "@/components/docs/docs-shell";
import { API_ERROR_CATALOG } from "@/lib/api-error-codes";
import Link from "next/link";

export const metadata = {
  title: "错误码 · 遇好API",
  description:
    "遇好API OpenAI 兼容接口错误码目录：HTTP 状态、type、code 与排查建议。",
};

export default function DocsErrorsPage() {
  return (
    <DocsShell
      pathname="/docs/errors"
      title="错误码"
      description="响应体为 OpenAI 兼容结构：error.message、error.type，以及平台稳定字段 error.code。客户端优先判断 code，其次 type。"
    >
      <DocsSection title="响应示例">
        <pre className="overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-xs text-slate-600">{`{
  "error": {
    "message": "额度不足，请充值",
    "type": "insufficient_quota",
    "code": "insufficient_quota"
  }
}`}</pre>
        <p>
          限流时还会返回响应头{" "}
          <code className="rounded bg-background px-1">Retry-After</code>
          （秒）。更多兼容差异见{" "}
          <Link
            href="/docs/compatibility"
            className="text-accent-dark hover:underline"
          >
            兼容说明
          </Link>
          。
        </p>
      </DocsSection>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface-elevated shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-background/80 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">HTTP</th>
              <th className="px-4 py-3 font-medium">code</th>
              <th className="px-4 py-3 font-medium">说明</th>
              <th className="px-4 py-3 font-medium">建议</th>
            </tr>
          </thead>
          <tbody>
            {API_ERROR_CATALOG.map((row) => (
              <tr
                key={row.code}
                id={row.code}
                className="border-b border-border/70 align-top last:border-0"
              >
                <td className="px-4 py-3 font-mono text-xs">{row.http}</td>
                <td className="px-4 py-3">
                  <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs text-accent-dark">
                    {row.code}
                  </code>
                  <p className="mt-1 text-xs text-muted">type: {row.type}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{row.title}</p>
                  <p className="mt-1 text-muted">{row.description}</p>
                </td>
                <td className="px-4 py-3 text-muted">{row.hint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DocsShell>
  );
}
