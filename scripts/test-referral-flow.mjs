/**
 * 邀请奖励流程自检 / 状态查询
 *
 * 用法：
 *   node scripts/test-referral-flow.mjs
 *   node scripts/test-referral-flow.mjs --email referrer@example.com
 *   node scripts/test-referral-flow.mjs --referrer A@x.com --invitee B@y.com
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

async function profileByEmail(email) {
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, aff_code, referred_by, balance")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function referralSummary(userId) {
  const { count: inviteCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("referred_by", userId);

  const { data: earnings } = await admin
    .from("referral_earnings")
    .select("*")
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false });

  let pending = 0;
  let total = 0;
  for (const e of earnings ?? []) {
    total += Number(e.reward_amount);
    if (e.status === "available") pending += Number(e.reward_amount);
  }

  return { inviteCount: inviteCount ?? 0, pending, total, earnings: earnings ?? [] };
}

async function main() {
  const referrerEmail = arg("--referrer") ?? arg("--email");
  const inviteeEmail = arg("--invitee");

  console.log("\n遇好API — 邀请奖励测试辅助\n");

  if (!referrerEmail) {
    console.log("未指定邮箱，显示测试步骤：\n");
    console.log("1. 邀请人登录 → /dashboard/referral → 复制邀请链接");
    console.log("2. 无痕窗口打开链接 → 注册好友账号（带 ?aff= 参数）");
    console.log("3. 好友登录 → /recharge 提交充值（上传凭证）");
    console.log("4. 管理员 → /admin/recharges → 确认到账（如 ¥100）");
    console.log("5. 好友首充到账 ≥ ¥50 → 邀请人与好友各得 5%；好友另获赠 ¥5 余额");
    console.log("6. 邀请人 → /dashboard/referral 查看待使用收益（首充额 × 5%）");
    console.log("7. 点击「划转到余额」→ 我的钱包余额增加\n");
    console.log("查询某用户状态：");
    console.log("  node scripts/test-referral-flow.mjs --email 邀请人邮箱");
    console.log("  node scripts/test-referral-flow.mjs --referrer A@x.com --invitee B@y.com\n");
    return;
  }

  const referrer = await profileByEmail(referrerEmail);
  if (!referrer) {
    console.error(`未找到用户: ${referrerEmail}`);
    process.exit(1);
  }

  const summary = await referralSummary(referrer.id);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  console.log(`邀请人: ${referrer.email}`);
  console.log(`aff_code: ${referrer.aff_code ?? "(未生成)"}`);
  console.log(`邀请链接: ${origin}/register?aff=${referrer.aff_code ?? ""}`);
  console.log(`账户余额: ¥${Number(referrer.balance ?? 0).toFixed(2)}`);
  console.log(`邀请人数: ${summary.inviteCount}`);
  console.log(`待使用收益: ¥${summary.pending.toFixed(2)}`);
  console.log(`累计收益: ¥${summary.total.toFixed(2)}`);

  if (inviteeEmail) {
    const invitee = await profileByEmail(inviteeEmail);
    if (!invitee) {
      console.error(`\n未找到被邀请人: ${inviteeEmail}`);
      process.exit(1);
    }
    const bound =
      invitee.referred_by === referrer.id
        ? "✓ 已绑定"
        : invitee.referred_by
          ? `✗ 绑定了其他人 (${invitee.referred_by})`
          : "✗ 未绑定邀请关系";
    console.log(`\n被邀请人: ${invitee.email}`);
    console.log(`邀请绑定: ${bound}`);
  }

  if (summary.earnings.length) {
    console.log("\n最近奖励记录:");
    for (const e of summary.earnings.slice(0, 5)) {
      console.log(
        `  - ¥${Number(e.reward_amount).toFixed(2)} (${e.status}) 充值 ¥${Number(e.recharge_amount).toFixed(2)} @ ${e.created_at}`
      );
    }
  } else {
    console.log("\n暂无奖励记录（好友充值确认到账后才会产生）");
  }

  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
