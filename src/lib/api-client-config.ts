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

export type SnippetParams = {
  apiKey: string;
  model: string;
  prompt?: string;
  baseUrl?: string;
};

export function buildCurlSnippet(params: SnippetParams): string {
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

export function buildPythonSnippet(params: SnippetParams): string {
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

export function buildNodeSnippet(params: SnippetParams): string {
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

# 保存后可在 Cursor Chat / Composer 中选择 OpenAI 兼容模型
# Agent / 工具调用建议使用 GPT 或 DeepSeek 分组（勿用 Gemini tools）`;
}

export function buildContinueSnippet(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
}): string {
  const base = params.baseUrl ?? getApiBaseUrl();
  return `# ~/.continue/config.yaml （或 Continue 设置 → YAML）
name: Yuhao API
version: 1.0.0
schema: v1
models:
  - name: Yuhao ${params.model}
    provider: openai
    model: ${params.model}
    apiBase: ${base}
    apiKey: ${params.apiKey}`;
}

export function buildClineSnippet(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
}): string {
  const base = params.baseUrl ?? getApiBaseUrl();
  return `# Cline / Roo Code → Settings → API Provider: OpenAI Compatible

Base URL: ${base}
API Key: ${params.apiKey}
Model ID: ${params.model}

# 模型 id 须与遇好API 价目一致（如 gpt-4o-mini、deepseek-chat）`;
}

export function buildLiteLlmSnippet(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
}): string {
  const base = params.baseUrl ?? getApiBaseUrl();
  return `# litellm_config.yaml
model_list:
  - model_name: yuhao-${params.model}
    litellm_params:
      model: openai/${params.model}
      api_base: ${base}
      api_key: ${params.apiKey}

# 调用示例
# litellm --model yuhao-${params.model} --message "你好"`;
}

export function buildLangChainSnippet(params: SnippetParams): string {
  const base = params.baseUrl ?? getApiBaseUrl();
  return `from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="${params.model}",
    api_key="${params.apiKey}",
    base_url="${base}",
    temperature=0.7,
)

print(llm.invoke("你好").content)`;
}

export function buildOpenWebUiSnippet(params: {
  apiKey: string;
  baseUrl?: string;
}): string {
  const base = params.baseUrl ?? getApiBaseUrl();
  return `# Open WebUI → Admin → Connections → OpenAI

API Base URL: ${base}
API Key: ${params.apiKey}

# 保存后在模型列表刷新，勾选需要启用的模型`;
}

export function buildLobeChatSnippet(params: {
  apiKey: string;
  baseUrl?: string;
}): string {
  const base = params.baseUrl ?? getApiBaseUrl();
  return `# LobeChat → 设置 → 语言模型 → OpenAI

API Key: ${params.apiKey}
接口代理地址 / Base URL: ${base}

# 或在环境变量中：
# OPENAI_API_KEY=${params.apiKey}
# OPENAI_PROXY_URL=${base}`;
}

export function buildCherryStudioSnippet(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
}): string {
  const base = params.baseUrl ?? getApiBaseUrl();
  return `# Cherry Studio → 设置 → 模型服务 → 添加 → OpenAI 兼容

API 主机: ${base}
API 密钥: ${params.apiKey}
模型 ID: ${params.model}`;
}

export function buildEnvSnippet(params: {
  apiKey: string;
  baseUrl?: string;
}): string {
  const base = params.baseUrl ?? getApiBaseUrl();
  return `# .env （多数 OpenAI 兼容工具通用）
OPENAI_API_KEY=${params.apiKey}
OPENAI_BASE_URL=${base}
# 部分工具使用：
# OPENAI_API_BASE=${base}`;
}

export type IntegrationPreset = {
  id: string;
  label: string;
  category: "sdk" | "ide" | "app" | "framework";
  description: string;
  build: (params: {
    apiKey: string;
    model: string;
    baseUrl?: string;
  }) => string;
};

export const INTEGRATION_PRESETS: IntegrationPreset[] = [
  {
    id: "curl",
    label: "curl",
    category: "sdk",
    description: "命令行快速验证",
    build: (p) => buildCurlSnippet(p),
  },
  {
    id: "python",
    label: "Python SDK",
    category: "sdk",
    description: "官方 openai 包",
    build: (p) => buildPythonSnippet(p),
  },
  {
    id: "node",
    label: "Node.js SDK",
    category: "sdk",
    description: "openai npm 包",
    build: (p) => buildNodeSnippet(p),
  },
  {
    id: "env",
    label: "环境变量",
    category: "sdk",
    description: "通用 OPENAI_* 变量",
    build: (p) => buildEnvSnippet(p),
  },
  {
    id: "cursor",
    label: "Cursor",
    category: "ide",
    description: "Override OpenAI Base URL",
    build: (p) => buildCursorSnippet(p),
  },
  {
    id: "continue",
    label: "Continue",
    category: "ide",
    description: "VS Code / JetBrains 插件",
    build: (p) => buildContinueSnippet(p),
  },
  {
    id: "cline",
    label: "Cline / Roo",
    category: "ide",
    description: "OpenAI Compatible Provider",
    build: (p) => buildClineSnippet(p),
  },
  {
    id: "langchain",
    label: "LangChain",
    category: "framework",
    description: "ChatOpenAI + base_url",
    build: (p) => buildLangChainSnippet(p),
  },
  {
    id: "litellm",
    label: "LiteLLM",
    category: "framework",
    description: "统一网关 / 代理",
    build: (p) => buildLiteLlmSnippet(p),
  },
  {
    id: "openwebui",
    label: "Open WebUI",
    category: "app",
    description: "自托管聊天界面",
    build: (p) => buildOpenWebUiSnippet(p),
  },
  {
    id: "lobechat",
    label: "LobeChat",
    category: "app",
    description: "OpenAI 兼容接入",
    build: (p) => buildLobeChatSnippet(p),
  },
  {
    id: "cherry",
    label: "Cherry Studio",
    category: "app",
    description: "桌面客户端",
    build: (p) => buildCherryStudioSnippet(p),
  },
];

export const INTEGRATION_CATEGORY_LABEL: Record<
  IntegrationPreset["category"],
  string
> = {
  sdk: "SDK / 命令行",
  ide: "IDE / 编程助手",
  framework: "框架 / 网关",
  app: "客户端应用",
};
