"use client";

import { Copy, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Contact = {
  email: string;
  qq: string;
  wechat: string;
  hours: string;
  note: string;
};

export function SupportContactContent() {
  const [contact, setContact] = useState<Contact | null>(null);
  const [configured, setConfigured] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/support/contact")
      .then((r) => r.json())
      .then((d) => {
        setContact(d.contact ?? null);
        setConfigured(d.configured !== false);
      });
  }, []);

  async function copyText(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-900">
        <p className="font-medium">客服联系方式尚未配置</p>
        <p className="mt-2 text-amber-800/90">
          管理员请在环境变量中设置{" "}
          <code className="rounded bg-background px-1">NEXT_PUBLIC_SUPPORT_QQ</code>{" "}
          等字段后重启开发服务。
        </p>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="rounded-2xl border border-border bg-surface-elevated p-6 text-sm text-muted">
        加载中...
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold">
          <MessageCircle className="h-5 w-5 text-accent" />
          联系方式
        </h2>
        <p className="mt-1 text-sm text-muted">{contact.hours}</p>
        <ul className="mt-4 space-y-4">
          {contact.email && (
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-accent" />
                <span className="text-muted">邮箱</span>
                <a
                  href={`mailto:${contact.email}`}
                  className="font-medium text-foreground hover:text-accent-dark"
                >
                  {contact.email}
                </a>
              </div>
              <button
                type="button"
                onClick={() => void copyText("email", contact.email)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied === "email" ? "已复制" : "复制"}
              </button>
            </li>
          )}
          {contact.qq && (
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm">
              <span>
                <span className="text-muted">QQ：</span>
                <span className="font-medium">{contact.qq}</span>
              </span>
              <button
                type="button"
                onClick={() => void copyText("qq", contact.qq)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied === "qq" ? "已复制" : "复制"}
              </button>
            </li>
          )}
          {contact.wechat && (
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm">
              <span>
                <span className="text-muted">微信：</span>
                <span className="font-medium">{contact.wechat}</span>
              </span>
              <button
                type="button"
                onClick={() => void copyText("wechat", contact.wechat)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied === "wechat" ? "已复制" : "复制"}
              </button>
            </li>
          )}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-surface-elevated p-6 text-sm text-muted shadow-sm">
        <p className="font-medium text-foreground">联系时请说明</p>
        <p className="mt-2 leading-relaxed">{contact.note}</p>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>您的注册邮箱</li>
          <li>问题发生的大致时间</li>
          <li>报错截图或 Playground 返回内容</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-surface-elevated p-6 text-sm shadow-sm">
        <p className="font-medium text-foreground">常见问题可先自助查看</p>
        <ul className="mt-3 space-y-2 text-muted">
          <li>
            额度不足 →{" "}
            <Link href="/recharge" className="text-accent-dark hover:underline">
              账户充值
            </Link>
          </li>
          <li>
            不会创建 Key →{" "}
            <Link href="/console" className="text-accent-dark hover:underline">
              令牌管理
            </Link>
          </li>
          <li>
            测试接口 →{" "}
            <Link href="/playground" className="text-accent-dark hover:underline">
              API 调试
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}
