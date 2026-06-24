/** 平台 OpenAI 兼容 API 根路径（含 /v1） */
export function getApiBaseUrl(originHint?: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    const origin = (site.startsWith("http") ? site : `https://${site}`).replace(
      /\/$/,
      ""
    );
    return `${origin}/v1`;
  }
  if (originHint) {
    return `${originHint.replace(/\/$/, "")}/v1`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/v1`;
  }
  return "https://yuhaoapi.com/v1";
}

export function getChatCompletionsUrl(baseUrl?: string): string {
  const base = baseUrl ?? getApiBaseUrl();
  return `${base.replace(/\/$/, "")}/chat/completions`;
}

export function buildCurlSnippet(params: {
  apiKey: string;
  model: string;
  prompt?: string;
  baseUrl?: string;
}): string {
  const url = getChatCompletionsUrl(params.baseUrl);
  const prompt = params.prompt ?? "你好";
  const body = JSON.stringify(
    {
      model: params.model,
      messages: [{ role: "user", content: prompt }],
    },
    null,
    2
  );
  return `curl ${url} \\
  -H "Authorization: Bearer ${params.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${body.replace(/'/g, "'\\''")}'`;
}

export function buildPythonSnippet(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
}): string {
  const base = params.baseUrl ?? getApiBaseUrl();
  return `from openai import OpenAI

client = OpenAI(
    base_url="${base}",
    api_key="${params.apiKey}",
)

response = client.chat.completions.create(
    model="${params.model}",
    messages=[{"role": "user", "content": "你好"}],
)
print(response.choices[0].message.content)`;
}

export function buildNodeSnippet(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
}): string {
  const base = params.baseUrl ?? getApiBaseUrl();
  return `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${base}",
  apiKey: "${params.apiKey}",
});

const res = await client.chat.completions.create({
  model: "${params.model}",
  messages: [{ role: "user", content: "你好" }],
});
console.log(res.choices[0]?.message?.content);`;
}

export function buildCursorSnippet(params: {
  apiKey: string;
  baseUrl?: string;
}): string {
  const base = params.baseUrl ?? getApiBaseUrl();
  return `# Cursor → Settings → Models → OpenAI

OpenAI API Key:
${params.apiKey}

Override OpenAI Base URL (Custom):
${base}

# 保存后可在 Cursor Chat / Composer 中选择 OpenAI 兼容模型`;
}
