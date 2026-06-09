/**
 * 创建 recharge_records 表
 * 需 .env.local 中配置 DATABASE_URL，或改在 Supabase SQL Editor 执行 supabase-recharge-records.sql
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
  console.error(
    "缺少 DATABASE_URL。请在 Supabase SQL Editor 中执行 supabase-recharge-records.sql"
  );
  process.exit(1);
}

const sql = readFileSync(
  join(root, "supabase-recharge-records.sql"),
  "utf8"
);

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query(sql);
  console.log("✓ recharge_records 表已创建");
} finally {
  await client.end();
}
