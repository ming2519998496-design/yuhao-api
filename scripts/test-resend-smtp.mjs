/**
 * 本地测试 Resend 是否能发信（不经过 Supabase）
 *
 * .env.local 添加（测试完可删，勿提交 Git）：
 *   RESEND_API_KEY=re_xxxx
 *   TEST_EMAIL_TO=你的收件邮箱
 *
 * 运行：node scripts/test-resend-smtp.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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

const apiKey = process.env.RESEND_API_KEY;
const to = process.env.TEST_EMAIL_TO;

if (!apiKey || !to) {
  console.error(`
请在 .env.local 添加：
RESEND_API_KEY=re_你的Resend密钥
TEST_EMAIL_TO=2519998496@qq.com

然后：node scripts/test-resend-smtp.mjs
`);
  process.exit(1);
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "onboarding@resend.dev",
    to: [to],
    subject: "遇好API Resend 测试",
    text: "收到说明 Resend 密钥和收件人有效。若此成功但 Supabase 注册仍失败，问题在 Supabase SMTP 保存项。",
  }),
});

const body = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error("✗ Resend API 失败:", res.status, JSON.stringify(body, null, 2));
  console.error("\n常见原因：API Key 无效；免费测试只能发到 Resend 账号里验证过的邮箱。");
  process.exit(1);
}

console.log("✓ Resend 发信成功, id:", body.id);
console.log("请查", to, "收件箱，并在 https://resend.com/emails 查看记录。");
