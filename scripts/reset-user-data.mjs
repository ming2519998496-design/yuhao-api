/**
 * 清零指定用户的业务数据（调用记录、API Key 余额与累计消费）
 * 用法：node scripts/reset-user-data.mjs <email>
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
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnv();

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email) {
  console.error("用法: node scripts/reset-user-data.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey);

const { data: list, error: listError } = await admin.auth.admin.listUsers({
  perPage: 1000,
});
if (listError) {
  console.error("读取用户失败:", listError.message);
  process.exit(1);
}

const user = list.users.find((u) => u.email?.toLowerCase() === email);
if (!user) {
  console.error(`未找到用户: ${email}`);
  process.exit(1);
}

const userId = user.id;
console.log(`用户: ${email} (${userId})`);

const { count: usageBefore } = await admin
  .from("usage_logs")
  .select("id", { count: "exact", head: true })
  .eq("user_id", userId);

const { error: delError, count: usageDeleted } = await admin
  .from("usage_logs")
  .delete({ count: "exact" })
  .eq("user_id", userId);

if (delError) {
  console.error("删除调用记录失败:", delError.message);
  process.exit(1);
}

const { data: keys, error: keysError } = await admin
  .from("api_keys")
  .select("id, balance, total_usage")
  .eq("user_id", userId);

if (keysError) {
  console.error("读取 API Key 失败:", keysError.message);
  process.exit(1);
}

let keysReset = 0;
if (keys?.length) {
  const { error: updError } = await admin
    .from("api_keys")
    .update({
      balance: 0,
      total_usage: 0,
      last_used_at: null,
    })
    .eq("user_id", userId);

  if (updError) {
    console.error("重置 API Key 失败:", updError.message);
    process.exit(1);
  }
  keysReset = keys.length;
}

const { count: usageAfter } = await admin
  .from("usage_logs")
  .select("id", { count: "exact", head: true })
  .eq("user_id", userId);

const { data: keysAfter } = await admin
  .from("api_keys")
  .select("balance, total_usage")
  .eq("user_id", userId);

const totalBalance = (keysAfter ?? []).reduce((s, k) => s + Number(k.balance), 0);
const totalUsage = (keysAfter ?? []).reduce((s, k) => s + Number(k.total_usage), 0);

console.log("✓ 清零完成");
console.log(`  调用记录: ${usageBefore ?? 0} → ${usageAfter ?? 0}（本次删除 ${usageDeleted ?? 0} 条）`);
console.log(`  API Key: ${keysReset} 个已归零`);
console.log(`  当前总余额: ${totalBalance}，累计消费: ${totalUsage}`);
