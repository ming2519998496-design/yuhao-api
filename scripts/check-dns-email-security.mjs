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
    // dig 对同一主机名可能返回多行 TXT，每行一条记录；勿把多行合并成一行
    return out
      .split("\n")
      .map((line) => {
        let s = line.trim();
        // 同一行内分段 TXT（如长 DKIM）："part1""part2" → part1part2
        s = s.replace(/"\s*"/g, "");
        return s.replace(/^"+|"+$/g, "").trim();
      })
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

function dmarcPolicy(records) {
  const rec = records.find((r) => r.toLowerCase().startsWith("v=dmarc1"));
  if (!rec) return null;
  const m = rec.match(/\bp\s*=\s*(\w+)/i);
  return m ? m[1].toLowerCase() : null;
}

const rootTxt = digTxt(domain);
const dmarcTxt = digTxt(`_dmarc.${domain}`);
const dmarcPol = dmarcPolicy(dmarcTxt);
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
    ok: hasDmarc(dmarcTxt) && dmarcPol && dmarcPol !== "none",
    warn: hasDmarc(dmarcTxt) && dmarcPol === "none",
    hint:
      dmarcPol === "none"
        ? "将 _dmarc 的 p=none 升级为 p=quarantine（见 docs/dns-email-security.md）"
        : "添加 TXT _dmarc → v=DMARC1; p=quarantine; rua=mailto:dmarc@yuhaoapi.com; ...",
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
let warned = 0;
for (const c of checks) {
  const mark = c.ok ? "✓" : c.warn ? "!" : "✗";
  console.log(`  ${mark} ${c.name}`);
  if (c.warn) {
    warned++;
    console.log(`      ⚠ ${c.hint}`);
  } else if (!c.ok) {
    failed++;
    console.log(`      → ${c.hint}`);
  }
}

if (failed === 0 && warned === 0) {
  console.log("\n全部通过。\n");
} else if (failed === 0) {
  console.log(`\n${warned} 项建议优化（见 docs/dns-email-security.md）\n`);
} else {
  console.log(`\n${failed} 项待修复，见 docs/dns-email-security.md\n`);
}
process.exit(failed === 0 ? 0 : 1);
