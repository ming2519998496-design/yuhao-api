/**
 * 在 Supabase 数据库执行全部建表 + 安全加固 SQL
 *
 * 1. Supabase → Project Settings → Database → Connection string → URI
 * 2. .env.local 添加：DATABASE_URL=postgresql://postgres.[ref]:[密码]@...
 * 3. 运行：npm run db:setup
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const MIGRATION_FILES = [
  "supabase-schema.sql",
  "supabase-admin-schema.sql",
  "supabase-functions.sql",
  "supabase-security-fix.sql",
  "supabase-billing-reserve.sql",
];

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
缺少 DATABASE_URL，无法代你连接 Supabase 数据库。

请一次性配置后运行：npm run db:setup

1. 打开项目首页，点顶部绿色 **Connect**（或直达下方链接）
   https://supabase.com/dashboard/project/loppdowrbhyoeuqgrfif?showConnect=true
2. 选 **Session pooler** 或 **Direct connection** → 复制 URI（把 [YOUR-PASSWORD] 换成数据库密码）
3. 写入 .env.local 一行，例如：
   DATABASE_URL=postgresql://postgres.loppdowrbhyoeuqgrfif:你的密码@aws-0-xxx.pooler.supabase.com:6543/postgres

或在 Supabase SQL Editor 里按顺序手动执行这 4 个文件：
  ${MIGRATION_FILES.join("\n  ")}
`);
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("已连接数据库，开始执行迁移…\n");

  for (const file of MIGRATION_FILES) {
    const path = join(root, file);
    if (!existsSync(path)) {
      throw new Error(`找不到文件: ${file}`);
    }
    const sql = readFileSync(path, "utf8");
    console.log(`→ ${file}`);
    await client.query(sql);
    console.log(`  ✓ 完成\n`);
  }

  const { rows } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('api_keys', 'usage_logs', 'profiles', 'platform_settings')
    ORDER BY table_name
  `);
  console.log("当前 public 表:", rows.map((r) => r.table_name).join(", ") || "(无)");
  console.log("\n全部迁移执行完成。");
} catch (e) {
  console.error("\n执行失败:", e.message);
  if (e.message?.includes("already exists")) {
    console.error("提示：部分对象已存在时可忽略，或只执行 supabase-security-fix.sql");
  }
  process.exit(1);
} finally {
  await client.end();
}
