/**
 * 在 Supabase 创建 profiles、platform_settings 等管理后台表
 *
 * 用法：
 * 1. Supabase Dashboard → Project Settings → Database → Connection string (URI)
 * 2. 在 .env.local 添加：DATABASE_URL=postgresql://postgres.[ref]:[密码]@...
 * 3. 运行：node scripts/apply-admin-schema.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

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

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(`
缺少 DATABASE_URL。

请打开 Supabase → Project Settings → Database → Connection string (URI)，
复制连接串并写入 .env.local：

DATABASE_URL=postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-xxx.pooler.supabase.com:6543/postgres

然后重新运行：node scripts/apply-admin-schema.mjs

或在 Supabase SQL Editor 中粘贴执行：supabase-admin-schema.sql
`);
  process.exit(1);
}

const files = ["supabase-schema.sql", "supabase-admin-schema.sql"];
const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  for (const file of files) {
    const sql = readFileSync(join(root, file), "utf8");
    console.log(`执行 ${file} ...`);
    await client.query(sql);
    console.log(`✓ ${file}`);
  }
  console.log("\n数据库表已创建完成。");
} catch (e) {
  console.error("执行失败:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
