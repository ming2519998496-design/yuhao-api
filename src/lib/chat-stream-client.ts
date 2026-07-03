import { sanitizeUpstreamErrorMessage } from "@/lib/upstream-error-message";

export type ChatRole = "user" | "assistant";

export type ChatPayloadMessage = {
  role: ChatRole;
  content: string;
};

export type ChatBillingInfo = {
  cost: string;
  balance: string;
};

export type RequestChatCompletionOptions = {
  keyId: string;
  model: string;
  messages: ChatPayloadMessage[];
  stream?: boolean;
  signal?: AbortSignal;
  turnstileToken?: string | null;
  onDelta: (delta: string) => void;
  onComplete: (billing?: ChatBillingInfo) => void;
  onError: (message: string) => void;
};

function readBillingHeaders(response: Response): ChatBillingInfo | undefined {
  const cost = response.headers.get("X-Yuhao-Billing-Cost-Cny");
  const balance = response.headers.get("X-Yuhao-Billing-Balance-Cny");
  if (!cost || !balance) return undefined;
  return { cost, balance };
}

function parseSseDelta(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") return null;
  try {
    const parsed = JSON.parse(payload) as {
      choices?: Array<{ delta?: { content?: string } }>;
    };
    return parsed.choices?.[0]?.delta?.content ?? null;
  } catch {
    return null;
  }
}

export async function requestChatCompletion(
  options: RequestChatCompletionOptions
): Promise<void> {
  const useStream = options.stream !== false;

  let response: Response;
  try {
    response = await fetch("/api/web/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        keyId: options.keyId,
        model: options.model,
        messages: options.messages,
        stream: useStream,
        turnstileToken: options.turnstileToken,
      }),
      signal: options.signal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      options.onError("已停止生成");
      return;
    }
    options.onError(err instanceof Error ? err.message : "网络请求失败");
    return;
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    options.onError(
      sanitizeUpstreamErrorMessage(
        data.error?.message ?? `请求失败 (${response.status})`
      )
    );
    return;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (data.error?.message) {
      options.onError(sanitizeUpstreamErrorMessage(data.error.message));
      return;
    }
    const text = data.choices?.[0]?.message?.content ?? "";
    if (text) options.onDelta(text);
    options.onComplete(readBillingHeaders(response));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    options.onError("无法读取流式响应");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const delta = parseSseDelta(line);
        if (delta) options.onDelta(delta);
      }
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      options.onError("已停止生成");
      return;
    }
    options.onError(err instanceof Error ? err.message : "流式读取失败");
    return;
  }

  options.onComplete();
}

export async function requestGeneration(options: {
  keyId: string;
  model: string;
  prompt: string;
  signal?: AbortSignal;
  turnstileToken?: string | null;
}): Promise<
  | { ok: true; data: unknown; billing?: ChatBillingInfo }
  | { ok: false; message: string }
> {
  let response: Response;
  try {
    response = await fetch("/api/web/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        keyId: options.keyId,
        model: options.model,
        prompt: options.prompt,
        turnstileToken: options.turnstileToken,
      }),
      signal: options.signal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, message: "已取消生成" };
    }
    return {
      ok: false,
      message: err instanceof Error ? err.message : "网络请求失败",
    };
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = sanitizeUpstreamErrorMessage(
      (data as { error?: { message?: string } }).error?.message ??
        `请求失败 (${response.status})`
    );
    return { ok: false, message };
  }

  return {
    ok: true,
    data,
    billing: readBillingHeaders(response),
  };
}
