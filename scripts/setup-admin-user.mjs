/**
 * 创建或更新管理员账户（邮箱 + 初始密码）并同步 admin 角色
 * 用法：node scripts/setup-admin-user.mjs <email> <password>
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
const password = process.argv[3] ?? "";

if (!email || !password) {
  console.error("用法: node scripts/setup-admin-user.mjs <email> <password>");
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

let user = list.users.find((u) => u.email?.toLowerCase() === email);

if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("创建用户失败:", error.message);
    process.exit(1);
  }
  user = data.user;
  console.log(`✓ 已创建账户: ${email}`);
} else {
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
  });
  if (error) {
    console.error("更新密码失败:", error.message);
    process.exit(1);
  }
  console.log(`✓ 已更新密码: ${email}`);
}

const { error: profileError } = await admin.from("profiles").upsert({
  id: user.id,
  email: user.email,
  full_name: user.user_metadata?.full_name ?? "",
  role: "admin",
  updated_at: new Date().toISOString(),
});

if (profileError) {
  console.error("同步 profile 失败:", profileError.message);
  process.exit(1);
}

console.log(`✓ ${email} 已设为管理员，可使用该邮箱与密码登录`);
