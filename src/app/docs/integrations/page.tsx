import { DocsSection, DocsShell } from "@/components/docs/docs-shell";
import { IntegrationConfigsPanel } from "@/components/docs/integration-configs-panel";
import Link from "next/link";

export const metadata = {
  title: "一键配置 · 遇好API",
  description:
    "Cursor、Continue、Cline、LiteLLM、LangChain、Open WebUI、LobeChat、Cherry Studio 等一键复制配置。",
};

export default function DocsIntegrationsPage() {
  return (
    <DocsShell
      pathname="/docs/integrations"
      title="一键配置"
      description="把下面配置中的密钥换成你的 yh_… Key，模型 id 换成价目表中的实际模型即可。"
    >
      <DocsSection title="使用前准备">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            在{" "}
            <Link
              href="/console?create=1"
              className="text-accent-dark hover:underline"
            >
              令牌管理
            </Link>{" "}
            创建 Key，并勾选需要的厂商分组
          </li>
          <li>
            确认账户有余额（{" "}
            <Link href="/recharge" className="text-accent-dark hover:underline">
              充值
            </Link>
            ）
          </li>
          <li>
            Agent / 工具调用请选用 OpenAI 或 DeepSeek 模型（Gemini 不支持
            tools）
          </li>
        </ol>
      </DocsSection>

      <IntegrationConfigsPanel />

      <DocsSection title="说明">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            各工具菜单名称可能随版本变化，核心是「OpenAI 兼容 + 自定义 Base
            URL」。
          </li>
          <li>
            配置示例中的模型 id 仅为占位，请以{" "}
            <Link href="/pricing" className="text-accent-dark hover:underline">
              价目表
            </Link>{" "}
            为准。
          </li>
          <li>
            出错时对照{" "}
            <Link href="/docs/errors" className="text-accent-dark hover:underline">
              错误码
            </Link>
            。
          </li>
        </ul>
      </DocsSection>
    </DocsShell>
  );
}
