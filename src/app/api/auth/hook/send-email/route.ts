import { sendResendAuthEmail } from "@/lib/resend-auth-email";
import { Webhook } from "standardwebhooks";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getHookSecret(): string | null {
  const raw = process.env.SUPABASE_SEND_EMAIL_HOOK_SECRET;
  if (!raw) return null;
  return raw.replace(/^v1,whsec_/, "");
}

export async function POST(request: Request) {
  const secret = getHookSecret();
  if (!secret) {
    return NextResponse.json(
      {
        error: {
          http_code: 500,
          message: "未配置 SUPABASE_SEND_EMAIL_HOOK_SECRET",
        },
      },
      { status: 500 }
    );
  }

  const payload = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  try {
    const wh = new Webhook(secret);
    const verified = wh.verify(payload, headers) as {
      user: { email?: string };
      email_data: {
        token: string;
        email_action_type: string;
        token_new?: string;
      };
    };

    const email = verified.user?.email;
    const { token, email_action_type: action, token_new: tokenNew } =
      verified.email_data ?? {};

    if (!email || !token) {
      return NextResponse.json(
        { error: { http_code: 400, message: "缺少 email 或 token" } },
        { status: 400 }
      );
    }

    const result = await sendResendAuthEmail({
      to: email,
      action,
      token,
      tokenNew: tokenNew || undefined,
    });

    if (!result.ok) {
      console.error("[send-email hook]", result.message);
      return NextResponse.json(
        { error: { http_code: 500, message: result.message } },
        { status: 500 }
      );
    }

    return new NextResponse(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "签名校验失败";
    return NextResponse.json(
      { error: { http_code: 401, message } },
      { status: 401 }
    );
  }
}
