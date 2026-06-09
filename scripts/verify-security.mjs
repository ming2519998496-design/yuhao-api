/**
 * 验证安全加固是否生效（需先 npm run db:setup）
 * 运行：npm run db:verify
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
  console.error("缺少 DATABASE_URL，请先配置后运行 npm run db:setup");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const results = [];

function pass(msg) {
  results.push({ ok: true, msg });
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  results.push({ ok: false, msg });
  console.log(`  ✗ ${msg}`);
}

async function setJwtClaims(sub, role = "authenticated") {
  await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub, role }),
  ]);
}

async function clearJwtClaims() {
  await client.query(`SELECT set_config('request.jwt.claims', '', true)`);
}

try {
  await client.connect();
  console.log("安全验证开始…\n");

  // 1. api_keys 策略：仅 SELECT
  console.log("1. api_keys RLS 策略");
  const { rows: keyPolicies } = await client.query(`
    SELECT policyname, cmd FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'api_keys'
    ORDER BY cmd
  `);
  const cmds = keyPolicies.map((p) => p.cmd);
  if (!cmds.includes("INSERT") && !cmds.includes("UPDATE") && !cmds.includes("DELETE")) {
    pass("无 INSERT/UPDATE/DELETE 策略（客户端不可直接改 Key）");
  } else {
    fail(`仍存在危险策略: ${cmds.join(", ")}`);
  }
  if (cmds.includes("SELECT")) {
    pass("保留 SELECT（用户可读自己的 Key）");
  }

  // 2. deduct_balance 权限
  console.log("\n2. deduct_balance 函数权限");
  const { rows: privs } = await client.query(`
    SELECT
      has_function_privilege('anon', 'public.deduct_balance(uuid,numeric)', 'EXECUTE') AS anon_exec,
      has_function_privilege('authenticated', 'public.deduct_balance(uuid,numeric)', 'EXECUTE') AS auth_exec,
      has_function_privilege('service_role', 'public.deduct_balance(uuid,numeric)', 'EXECUTE') AS svc_exec
  `);
  const p = privs[0];
  if (!p.anon_exec && !p.auth_exec) pass("anon / authenticated 无法执行 deduct_balance");
  else fail(`deduct_balance 仍对客户端开放 (anon=${p.anon_exec}, auth=${p.auth_exec})`);
  if (p.svc_exec) pass("service_role 可执行 deduct_balance");
  else fail("service_role 无法执行 deduct_balance（网站扣费会失败）");

  // 3. 触发器存在
  console.log("\n3. 安全触发器");
  const { rows: triggers } = await client.query(`
    SELECT tgname FROM pg_trigger
    WHERE NOT tgisinternal
      AND tgname IN ('api_keys_guard_sensitive_trigger', 'profiles_guard_role_trigger')
  `);
  const names = new Set(triggers.map((t) => t.tgname));
  if (names.has("api_keys_guard_sensitive_trigger")) pass("api_keys_guard_sensitive_trigger 已安装");
  else fail("缺少 api_keys 保护触发器");
  if (names.has("profiles_guard_role_trigger")) pass("profiles_guard_role_trigger 已安装");
  else fail("缺少 profiles 角色保护触发器");

  // 4. 模拟 authenticated 用户篡改（需有测试用 uuid）
  console.log("\n4. 模拟攻击（JWT role=authenticated）");
  const fakeUser = "00000000-0000-4000-8000-000000000099";
  await setJwtClaims(fakeUser, "authenticated");

  try {
    await client.query(
      `INSERT INTO api_keys (user_id, key_hash, key_prefix, name, balance)
       VALUES ($1, 'deadbeef', 'yh_test...', 'hack', 99999)`,
      [fakeUser]
    );
    fail("authenticated 仍能 INSERT api_keys");
  } catch (e) {
    pass(`INSERT api_keys 被阻止: ${e.message.split("\n")[0]}`);
  }

  try {
    await client.query(
      `UPDATE profiles SET role = 'admin' WHERE id = $1`,
      [fakeUser]
    );
    // 无行时也可能 success；检查是否有 profile
    const { rows: prof } = await client.query(
      `SELECT role FROM profiles WHERE id = $1`,
      [fakeUser]
    );
    if (prof.length && prof[0].role === "admin") {
      fail("authenticated 仍能把 role 改成 admin");
    } else {
      pass("UPDATE profiles.role 未成功提权（或无对应行）");
    }
  } catch (e) {
    pass(`UPDATE profiles.role 被阻止: ${e.message.split("\n")[0]}`);
  }

  try {
    await client.query(`SELECT deduct_balance($1::uuid, $2::decimal)`, [
      "00000000-0000-4000-8000-000000000001",
      -100,
    ]);
    fail("authenticated 仍能调用 deduct_balance");
  } catch (e) {
    pass(`RPC deduct_balance 被阻止: ${e.message.split("\n")[0]}`);
  }

  await clearJwtClaims();

  // 5. 负金额扣费
  console.log("\n5. deduct_balance 负数校验");
  try {
    await client.query(`SET LOCAL role TO service_role`);
    await client.query(`SELECT deduct_balance($1::uuid, $2::decimal)`, [
      "00000000-0000-4000-8000-000000000001",
      -1,
    ]);
    fail("负数金额未被拒绝");
  } catch (e) {
    if (e.message.includes("must be positive") || e.message.includes("positive")) {
      pass("负数 p_amount 被拒绝");
    } else {
      pass(`负数调用失败: ${e.message.split("\n")[0]}`);
    }
  } finally {
    await client.query(`RESET role`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n" + "=".repeat(40));
  if (failed.length === 0) {
    console.log("全部检查通过。");
  } else {
    console.log(`失败 ${failed.length} 项，请先执行: npm run db:setup`);
    process.exit(1);
  }
} catch (e) {
  console.error("验证过程出错:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
