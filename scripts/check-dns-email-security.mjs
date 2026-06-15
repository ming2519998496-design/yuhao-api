/**
 * 检查域名 SPF / DMARC / Resend DKIM 是否已配置
 * 用法：node scripts/check-dns-email-security.mjs [domain]
 * 默认 domain=yuhaoapi.com
 */

import { execSync } from "child_process";

const domain = process.argv[2]?.trim() || "yuhaoapi.com";

function digTxt(name) {
  try {
    const out = execSync(`dig TXT ${name} +short`, { encoding: "utf8" }).trim();
    if (!out) return [];
    // 合并多段 TXT（如 DKIM 长密钥）为一条
    const merged = out.replace(/\n/g, "").replace(/"\s+"/g, "");
    return merged
      .split("\n")
      .map((line) => line.replace(/^"+|"+$/g, "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function hasSpf(records) {
  return records.some((r) => r.toLowerCase().startsWith("v=spf1"));
}

function hasDmarc(records) {
  return records.some((r) => r.toLowerCase().startsWith("v=dmarc1"));
}

const rootTxt = digTxt(domain);
const dmarcTxt = digTxt(`_dmarc.${domain}`);
const dkimTxt = digTxt(`resend._domainkey.${domain}`);
const sendSpf = digTxt(`send.${domain}`);

const checks = [
  {
    name: `根域 SPF (${domain})`,
    ok: hasSpf(rootTxt),
    hint: '添加 TXT @ → v=spf1 include:_spf.google.com include:amazonses.com ~all',
  },
  {
    name: `DMARC (_dmarc.${domain})`,
    ok: hasDmarc(dmarcTxt),
    hint: '添加 TXT _dmarc → v=DMARC1; p=none; rua=mailto:dmarc@yuhaoapi.com; ...',
  },
  {
    name: `Resend DKIM (resend._domainkey.${domain})`,
    ok: dkimTxt.length > 0,
    hint: "在 Resend Domains 验证域名后自动提供",
  },
  {
    name: `Resend 子域 SPF (send.${domain})`,
    ok: hasSpf(sendSpf),
    hint: "Resend 域名验证时添加 send 子域 SPF",
  },
];

console.log(`\n邮件防伪 DNS 检查：${domain}\n`);

let failed = 0;
for (const c of checks) {
  const mark = c.ok ? "✓" : "✗";
  console.log(`  ${mark} ${c.name}`);
  if (!c.ok) {
    failed++;
    console.log(`      → ${c.hint}`);
  }
}

console.log(failed === 0 ? "\n全部通过。\n" : `\n${failed} 项待修复，见 docs/dns-email-security.md\n`);
process.exit(failed === 0 ? 0 : 1);
