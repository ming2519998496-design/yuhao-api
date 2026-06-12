/**
 * 本地检测 OpenAI / Google 上游是否可达（支持 HTTPS_PROXY）
 *
 * 用法：
 *   1. 在 .env.local 配置 HTTPS_PROXY=http://127.0.0.1:7890
 *   2. npm run test:upstream
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { ProxyAgent, fetch as undiciFetch } from "undici";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnv();

const proxy =
  process.env.HTTPS_PROXY?.trim() ||
  process.env.HTTP_PROXY?.trim() ||
  "";

const openaiBase =
  process.env.OPENAI_BASE_URL?.trim() ||
  (process.env.AI_GATEWAY_API_KEY?.trim() ||
  process.env.OPENAI_USE_VERCEL_GATEWAY?.trim() === "true"
    ? "https://ai-gateway.vercel.sh/v1"
    : "https://api.openai.com/v1");
const googleBase =
  process.env.GOOGLE_BASE_URL?.trim() ||
  "https://generativelanguage.googleapis.com/v1beta";

const agent = proxy ? new ProxyAgent(proxy) : null;

async function probe(name, url) {
  const started = Date.now();
  try {
    const res = await undiciFetch(url, {
      method: "GET",
      dispatcher: agent ?? undefined,
      signal: AbortSignal.timeout(12_000),
    });
    const ms = Date.now() - started;
    console.log(`  ✓ ${name}  HTTP ${res.status}  (${ms}ms)`);
    return true;
  } catch (e) {
    const ms = Date.now() - started;
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  ✗ ${name}  ${msg}  (${ms}ms)`);
    return false;
  }
}

console.log("\n遇好API — 上游网络检测\n");
if (proxy) {
  console.log(`代理: ${proxy.replace(/:[^:@/]+@/, ":****@")}\n`);
} else {
  console.log(
    "未配置 HTTPS_PROXY。国内直连 OpenAI/Google 通常会失败。\n" +
      "在 .env.local 添加：HTTPS_PROXY=http://127.0.0.1:7890（端口按你的 Clash 等软件修改）\n"
  );
}

const results = await Promise.all([
  probe("OpenAI / Gateway", `${openaiBase}/models`),
  probe("Google Gemini", `${googleBase}/models`),
  probe("DeepSeek", "https://api.deepseek.com/v1/models"),
]);

console.log("");
if (results.every(Boolean)) {
  console.log("全部可达。重启 npm run dev 后在 Playground 测试 OpenAI / Gemini。\n");
  process.exit(0);
}

if (!proxy) {
  console.log(
    "建议：配置 HTTPS_PROXY 后重新运行 npm run test:upstream\n"
  );
} else {
  console.log(
    "仍有失败项：检查代理端口、节点能否访问 Google/OpenAI，或换节点后重试。\n"
  );
}
process.exit(1);
