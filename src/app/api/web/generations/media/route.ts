import { apiServerErrorResponse } from "@/lib/api-error";
import { resolveUpstreamApiKey } from "@/lib/upstream-keys-store";
import { upstreamFetch } from "@/lib/upstream-fetch";
import { requireActiveUserResponse } from "@/lib/session-api";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = ["generativelanguage.googleapis.com"];

function isAllowedMediaUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

/** 登录用户通过服务端拉取 Google 生成媒体（避免暴露上游 Key） */
export async function GET(request: NextRequest) {
  try {
    const session = await requireActiveUserResponse();
    if (session.response) return session.response;

    const uri = request.nextUrl.searchParams.get("uri")?.trim() ?? "";
    if (!uri || !isAllowedMediaUri(uri)) {
      return NextResponse.json({ error: "无效的媒体地址" }, { status: 400 });
    }

    const apiKey = await resolveUpstreamApiKey("google");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google 上游未配置" },
        { status: 500 }
      );
    }

    const upstream = await upstreamFetch(uri, {
      headers: { "x-goog-api-key": apiKey },
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "无法拉取视频文件" },
        { status: upstream.status || 502 }
      );
    }

    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "private, max-age=3600");

    const disposition = request.nextUrl.searchParams.get("download");
    if (disposition === "1") {
      headers.set("Content-Disposition", 'attachment; filename="yuhao-video.mp4"');
    }

    return new Response(upstream.body, { status: 200, headers });
  } catch (err: unknown) {
    console.error("[web/generations/media]", err);
    return apiServerErrorResponse();
  }
}
