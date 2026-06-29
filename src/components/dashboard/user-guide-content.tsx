import Link from "next/link";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-border bg-surface-elevated/60 p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}

export function UserGuideContent() {
  return (
    <div className="space-y-6">
      <nav className="rounded-xl border border-border bg-accent/5 px-4 py-3 text-sm">
        <p className="mb-2 font-medium text-foreground">目录</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-accent-dark">
          <li>
            <a href="#start" className="hover:underline">
              快速开始
            </a>
          </li>
          <li>
            <a href="#chat" className="hover:underline">
              AI 对话
            </a>
          </li>
          <li>
            <a href="#keys" className="hover:underline">
              令牌与计费
            </a>
          </li>
          <li>
            <a href="#wallet" className="hover:underline">
              充值与余额
            </a>
          </li>
          <li>
            <a href="#faq" className="hover:underline">
              常见问题
            </a>
          </li>
          <li>
            <a href="#developer" className="hover:underline">
              开发者接入
            </a>
          </li>
        </ul>
      </nav>

      <Section id="start" title="1. 快速开始">
        <p>按以下顺序即可在网站上使用 AI 能力：</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <Link href="/register" className="text-accent-dark hover:underline">
              注册
            </Link>
            并登录账户（新用户通常有体验金，以平台公告为准）。
          </li>
          <li>
            进入{" "}
            <Link href="/recharge" className="text-accent-dark hover:underline">
              我的钱包
            </Link>
            充值，等待管理员确认到账（或使用已开通的在线支付）。
          </li>
          <li>
            打开{" "}
            <Link href="/console" className="text-accent-dark hover:underline">
              令牌管理
            </Link>
            ，创建 API Key。完整密钥{" "}
            <code className="rounded bg-background px-1">yh_...</code>{" "}
            仅显示一次，请立即复制保存。
          </li>
          <li>
            进入{" "}
            <Link href="/chat" className="text-accent-dark hover:underline">
              AI 对话
            </Link>
            ，选择 Key 与模型，即可开始对话或生成图像、视频。
          </li>
        </ol>
      </Section>

      <Section id="chat" title="2. AI 对话">
        <p>
          <Link href="/chat" className="text-accent-dark hover:underline">
            AI 对话
          </Link>{" "}
          支持三种模式，费用从账户共享余额扣除：
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">对话</strong>：多轮聊天，支持
            GPT、Gemini、DeepSeek 等（部分模型支持流式输出）。
          </li>
          <li>
            <strong className="text-foreground">图像</strong>：输入描述生成图片，可预览与下载。
          </li>
          <li>
            <strong className="text-foreground">视频</strong>：输入描述生成短视频（如
            Veo），生成可能需要 1–2 分钟。
          </li>
        </ul>
        <p>
          左侧可选择 API Key、模式与模型。发送后对话会自动保存到「历史记录」，点击可重新打开。
        </p>
        <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-amber-900">
          历史聊天信息仅保留 30 天，到期将自动清理。图像与视频在历史中保存为下载链接，请及时下载重要内容。
        </p>
      </Section>

      <Section id="keys" title="3. 令牌与计费">
        <p>
          在{" "}
          <Link href="/console" className="text-accent-dark hover:underline">
            令牌管理
          </Link>{" "}
          中可创建多个 API Key，并设置：
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">模型分组</strong>：限制该 Key
            可调用的厂商与模型范围。
          </li>
          <li>
            <strong className="text-foreground">默认模型</strong>：未指定模型时的默认值。
          </li>
        </ul>
        <p>
          所有 Key 共用账户余额（见侧栏「账户余额」）。对话按 token 或按次计费，价目见{" "}
          <Link href="/pricing" className="text-accent-dark hover:underline">
            价格说明
          </Link>
          。调用前会预扣余额，完成后按实际用量结算。
        </p>
        <p>
          若需在自有程序中调用，请使用完整 Key，并参阅下方「开发者接入」。
        </p>
      </Section>

      <Section id="wallet" title="4. 充值与余额">
        <p>
          在{" "}
          <Link href="/recharge" className="text-accent-dark hover:underline">
            我的钱包
          </Link>{" "}
          可查看余额与充值记录。
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>提交充值后，需管理员在后台确认到账，余额才会增加。</li>
          <li>余额不足时，AI 对话与 API 调用会提示充值。</li>
          <li>消费明细可在「数据看板」查看近期请求与扣费。</li>
        </ul>
      </Section>

      <Section id="faq" title="5. 常见问题">
        <div className="space-y-4">
          <div>
            <p className="font-medium text-foreground">历史记录为空？</p>
            <p className="mt-1">
              请确认管理员已在数据库执行{" "}
              <code className="rounded bg-background px-1">
                supabase-chat-features.sql
              </code>
              。发送至少一条消息后刷新页面；若仍无记录，请{" "}
              <Link
                href="/dashboard/support"
                className="text-accent-dark hover:underline"
              >
                联系客服
              </Link>
              。
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">提示余额不足？</p>
            <p className="mt-1">
              请先充值并等待到账，或检查数据看板中的账户余额是否为 0。
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">模型无权限 / 403？</p>
            <p className="mt-1">
              当前 Key 的分组未包含该模型，请在令牌管理中编辑 Key，勾选对应厂商分组。
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">视频生成失败？</p>
            <p className="mt-1">
              视频生成耗时较长，请耐心等待；若提示上游错误，可能是内容审核未通过或 Google
              上游 Key 未配置，请联系客服。
            </p>
          </div>
        </div>
      </Section>

      <Section id="developer" title="6. 开发者接入">
        <p>
          若要在 Cursor、Python、Node 等环境中调用本平台，请阅读{" "}
          <Link
            href="/docs/quickstart"
            className="text-accent-dark hover:underline"
          >
            API 快速开始
          </Link>
          。接口兼容 OpenAI 格式，只需替换 Base URL 与 API Key。
        </p>
        <p>
          也可使用{" "}
          <Link href="/playground" className="text-accent-dark hover:underline">
            API 调试
          </Link>{" "}
          在浏览器中测试请求与返回格式。
        </p>
      </Section>
    </div>
  );
}
