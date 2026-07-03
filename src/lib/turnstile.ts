import { getClientIp } from "@/lib/client-ip";

type TurnstileVerifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export async function verifyTurnstileToken(
  token: string | undefined | null,
  request: Request
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isTurnstileEnabled()) {
    return { ok: true };
  }

  const trimmed = token?.trim();
  if (!trimmed) {
    return {
      ok: false,
      message: "请完成人机验证后重试（刷新页面）",
    };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY!.trim();
  const body = new URLSearchParams({
    secret,
    response: trimmed,
    remoteip: getClientIp(request),
  });

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }
    );
    const data = (await response.json()) as TurnstileVerifyResponse;
    if (data.success) {
      return { ok: true };
    }
    return {
      ok: false,
      message: "人机验证未通过，请刷新页面后重试",
    };
  } catch {
    return {
      ok: false,
      message: "人机验证服务暂不可用，请稍后再试",
    };
  }
}
