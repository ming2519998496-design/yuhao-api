/**
 * 按 ADMIN_EMAILS 同步管理员 role 到 profiles（最多 2 个）
 * 运行：node scripts/sync-admin-role.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const MAX_ADMINS = 2;
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const raw = process.env.ADMIN_EMAILS ?? "";

if (!url || !serviceKey) {
  console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const allEmails = raw
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

if (!allEmails.length) {
  console.error("ADMIN_EMAILS 为空");
  process.exit(1);
}

if (allEmails.length > MAX_ADMINS) {
  console.error(
    `ADMIN_EMAILS 配置了 ${allEmails.length} 个邮箱，最多只允许 ${MAX_ADMINS} 个`
  );
  process.exit(1);
}

const emails = allEmails;
const admin = createClient(url, serviceKey);

const { data: users, error } = await admin.auth.admin.listUsers({
  perPage: 1000,
});
if (error) {
  console.error("读取用户失败:", error.message);
  process.exit(1);
}

// 先降级不在白名单中的管理员
const { data: currentAdmins } = await admin
  .from("profiles")
  .select("id, email")
  .eq("role", "admin");

const allowSet = new Set(emails);
for (const row of currentAdmins ?? []) {
  const e = row.email?.toLowerCase() ?? "";
  if (!allowSet.has(e)) {
    await admin
      .from("profiles")
      .update({ role: "user", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    console.log(`↓ 已取消管理员: ${row.email ?? row.id}`);
  }
}

let adminCount =
  (
    await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
  ).count ?? 0;

for (const email of emails) {
  const user = users.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    console.warn(`未找到已注册用户: ${email}（请先用该邮箱注册）`);
    continue;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" && adminCount >= MAX_ADMINS) {
    console.error(
      `无法将 ${email} 设为管理员：已达上限 ${MAX_ADMINS} 人，请先移除其他管理员`
    );
    continue;
  }

  const { error: upsertError } = await admin.from("profiles").upsert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name ?? "",
    role: "admin",
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    console.error(`${email} 同步失败:`, upsertError.message);
  } else {
    console.log(`✓ ${email} 已设为管理员`);
    if (profile?.role !== "admin") adminCount += 1;
  }
}
