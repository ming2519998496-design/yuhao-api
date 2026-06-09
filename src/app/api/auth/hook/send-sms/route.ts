import { sendAliyunSms } from "@/lib/aliyun-sms";
import { Webhook } from "standardwebhooks";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getHookSecret(): string | null {
  const raw = process.env.SUPABASE_SEND_SMS_HOOK_SECRET;
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
          message: "未配置 SUPABASE_SEND_SMS_HOOK_SECRET",
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

  let user: { phone?: string };
  let sms: { otp: string };

  try {
    const wh = new Webhook(secret);
    const verified = wh.verify(payload, headers) as {
      user: { phone?: string };
      sms: { otp: string };
    };
    user = verified.user;
    sms = verified.sms;
  } catch (e) {
    const message = e instanceof Error ? e.message : "签名校验失败";
    return NextResponse.json(
      { error: { http_code: 401, message } },
      { status: 401 }
    );
  }

  const phone = user?.phone;
  const otp = sms?.otp;

  if (!phone || !otp) {
    return NextResponse.json(
      { error: { http_code: 400, message: "缺少 phone 或 otp" } },
      { status: 400 }
    );
  }

  const result = await sendAliyunSms(phone, otp);

  if (!result.ok) {
    console.error("[send-sms hook]", result.message, { phone });
    return NextResponse.json(
      {
        error: {
          http_code: 500,
          message: result.message,
        },
      },
      { status: 500 }
    );
  }

  return new NextResponse(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
