import { getXorPayAppSecret } from "@/lib/payment/config";
import { processOnlinePaymentNotify } from "@/lib/payment/complete-online-recharge";
import { createXorPayProvider } from "@/lib/payment/xorpay";
import { NextRequest, NextResponse } from "next/server";

function collectNotifyPayload(request: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    out[key] = value;
  }
  return out;
}

/** XorPay 异步通知（须返回纯文本 success） */
export async function GET(request: NextRequest) {
  return handleNotify(request);
}

export async function POST(request: NextRequest) {
  return handleNotify(request);
}

async function handleNotify(request: NextRequest) {
  const secret = getXorPayAppSecret();
  if (!secret) {
    return new NextResponse("fail", { status: 503 });
  }

  let payload = collectNotifyPayload(request);

  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      payload = Object.fromEntries(params.entries());
    } else if (contentType.includes("multipart/form-data")) {
      try {
        const form = await request.formData();
        payload = Object.fromEntries(
          [...form.entries()].map(([k, v]) => [k, String(v)])
        );
      } catch {
        /* keep query payload */
      }
    }
  }

  const provider = createXorPayProvider("", secret);
  const verified = provider.verifyNotify(payload, secret);
  if (!verified.ok) {
    console.warn("[xorpay notify]", verified.error, payload);
    return new NextResponse("fail", { status: 400 });
  }

  const result = await processOnlinePaymentNotify(verified.data);
  if (!result.ok) {
    console.warn("[xorpay notify]", result.error, verified.data.orderNo);
    return new NextResponse("fail", {
      status: result.httpStatus ?? 500,
    });
  }

  return new NextResponse("success", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
