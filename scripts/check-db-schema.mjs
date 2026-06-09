/**
 * 本地检查 Supabase 表结构是否满足上线前第 1 步
 * 需 .env.local：NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * 用法：npm run check:db
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY（.env.local）");
  process.exit(1);
}

const admin = createClient(url, key);

const checks = [
  {
    name: "api_keys",
    run: () => admin.from("api_keys").select("id").limit(1),
  },
  {
    name: "api_keys.allowed_category_ids",
    run: () => admin.from("api_keys").select("allowed_category_ids").limit(1),
  },
  {
    name: "api_keys.default_model_id",
    run: () => admin.from("api_keys").select("default_model_id").limit(1),
  },
  {
    name: "recharge_records",
    run: () => admin.from("recharge_records").select("id").limit(1),
  },
  {
    name: "recharge_records.source (在线支付)",
    run: () => admin.from("recharge_records").select("source").limit(1),
  },
  {
    name: "recharge_records.pay_provider",
    run: () => admin.from("recharge_records").select("pay_provider").limit(1),
  },
  {
    name: "recharge_records.external_order_id",
    run: () => admin.from("recharge_records").select("external_order_id").limit(1),
  },
  {
    name: "referral_earnings",
    run: () => admin.from("referral_earnings").select("id").limit(1),
  },
  {
    name: "profiles (aff_code)",
    run: () => admin.from("profiles").select("aff_code").limit(1),
  },
  {
    name: "profiles.balance",
    run: () => admin.from("profiles").select("balance").limit(1),
  },
  {
    name: "profiles.is_frozen",
    run: () => admin.from("profiles").select("is_frozen").limit(1),
  },
  {
    name: "platform_settings",
    run: () => admin.from("platform_settings").select("key").limit(1),
  },
  {
    name: "balance_adjustment_logs",
    run: () => admin.from("balance_adjustment_logs").select("id").limit(1),
  },
];

let failed = 0;

console.log("\n遇好API — 数据库结构检查\n");

for (const c of checks) {
  const { error } = await c.run();
  if (error) {
    failed++;
    console.log(`  ✗ ${c.name}`);
    console.log(`    ${error.message}\n`);
  } else {
    console.log(`  ✓ ${c.name}`);
  }
}

if (failed === 0) {
  console.log("\n全部通过，可进入第 2 步（本地全流程自测）。\n");
  process.exit(0);
}

console.log(
  `\n有 ${failed} 项未通过。请在 Supabase SQL Editor 按 docs/launch-checklist.md 第 1 步执行迁移，或 Run supabase-step1-verify.sql 查看缺什么。\n`
);
process.exit(1);
