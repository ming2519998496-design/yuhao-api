import { verifyAdminPassword } from "@/lib/admin-password-verify";
import { requireAdmin } from "@/lib/auth-admin";
import {
  loadUpstreamKeys,
  saveUpstreamKeys,
  tailUpstreamKey,
} from "@/lib/upstream-keys-store";
import {
  maskUpstreamKey,
  mergeUpstreamKeyUpdates,
  mergeUpstreamKeys,
  sanitizeUpstreamKeys,
  UPSTREAM_PROVIDERS,
  type UpstreamKeysConfig,
} from "@/lib/upstream-keys-settings";
import { NextResponse } from "next/server";

function envConfigured(provider: string): boolean {
  if (provider === "openai") {
    return Boolean(
      process.env.AI_GATEWAY_API_KEY?.trim() ||
        process.env.OPENAI_API_KEY?.trim()
    );
  }
  return Boolean(process.env[`${provider.toUpperCase()}_API_KEY`]?.trim());
}

function toPublicView(keys: UpstreamKeysConfig, updatedAt: string | null) {
  const masked: UpstreamKeysConfig = {
    openai: maskUpstreamKey(keys.openai),
    google: maskUpstreamKey(keys.google),
    deepseek: maskUpstreamKey(keys.deepseek),
  };

  return {
    masked,
    configured: {
      openai: Boolean(keys.openai),
      google: Boolean(keys.google),
      deepseek: Boolean(keys.deepseek),
    },
    envFallback: {
      openai: envConfigured("openai"),
      google: envConfigured("google"),
      deepseek: envConfigured("deepseek"),
    },
    updatedAt,
    providers: UPSTREAM_PROVIDERS,
  };
}

/** 返回掩码后的配置（不含完整密钥） */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { keys, updatedAt } = await loadUpstreamKeys();
    return NextResponse.json(toPublicView(keys, updatedAt));
  } catch (e) {
    const message = e instanceof Error ? e.message : "读取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 验证管理员密码后返回完整密钥（仅用于后台编辑） */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求体" }, { status: 400 });
  }

  const password = body.password ?? "";
  const verified = await verifyAdminPassword(auth.user!.email ?? "", password);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 401 });
  }

  try {
    const { keys, updatedAt } = await loadUpstreamKeys();
    return NextResponse.json({
      keys,
      updatedAt,
      message: "已解锁，请妥善保管页面内容",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "读取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 保存上游密钥（须再次验证管理员密码） */
export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { password?: string; keys?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求体" }, { status: 400 });
  }

  const password = body.password ?? "";
  const verified = await verifyAdminPassword(auth.user!.email ?? "", password);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 401 });
  }

  const incoming = mergeUpstreamKeys(body.keys);
  try {
    const { keys: existing } = await loadUpstreamKeys();
    const merged = sanitizeUpstreamKeys(
      mergeUpstreamKeyUpdates(incoming, existing)
    );
    await saveUpstreamKeys(merged, auth.user!.id);
    const appliedAt = new Date().toISOString();
    return NextResponse.json({
      success: true,
      message:
        "上游 API Key 已保存，已立即生效（无需重启服务）。下一笔 API 调用将使用新 Key。",
      appliedAt,
      keyTails: {
        openai: merged.openai ? tailUpstreamKey(merged.openai) : null,
        google: merged.google ? tailUpstreamKey(merged.google) : null,
        deepseek: merged.deepseek ? tailUpstreamKey(merged.deepseek) : null,
      },
      ...toPublicView(merged, appliedAt),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
