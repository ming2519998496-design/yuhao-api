# yuhaoapi.com 邮件防伪 DNS（SPF / DMARC）

安全扫描若提示「邮件域缺少 SPF / DMARC」，需在 **域名 DNS**（当前为 Cloudflare）添加记录。  
代码无法代你改 DNS，请按下列步骤在 Cloudflare Dashboard 手动添加。

> 当前状态：`send.yuhaoapi.com` 已有 Resend 的 SPF/DKIM；根域需有 SPF 与 **DMARC（建议 `p=quarantine`，勿长期 `p=none`）**。

## 一、SPF（根域 @）

根域 MX 指向 Google（`smtp.google.com`），发信经 **Google Workspace + Resend**，根域 SPF 需同时授权两者。

1. Cloudflare → **yuhaoapi.com** → **DNS** → **Records**
2. **Add record**：
   - **Type**：`TXT`
   - **Name**：`@`（或留空）
   - **Content**：

     ```txt
     v=spf1 include:_spf.google.com include:amazonses.com ~all
     ```

   - **TTL**：Auto
3. **Save**

说明：

- `_spf.google.com`：Google Workspace 发信
- `amazonses.com`：Resend 发信（与 `send.yuhaoapi.com` 上已有 SPF 一致）
- 根域 **只能有一条** SPF；勿重复添加多条 `v=spf1`

验证：

```bash
dig TXT yuhaoapi.com +short | grep spf
```

## 二、DMARC

1. **Add record**：
   - **Type**：`TXT`
   - **Name**：`_dmarc`
   - **Content**（推荐生产策略，把收件邮箱改成你能收到的地址）：

     ```txt
     v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@yuhaoapi.com; adkim=s; aspf=r
     ```

   若刚接入 SPF/DKIM、尚未观察过报告，可先用监控模式 1～2 周：

   ```txt
   v=DMARC1; p=none; rua=mailto:dmarc@yuhaoapi.com; adkim=s; aspf=r
   ```

   确认 Resend / Google 邮件均 `dmarc=pass` 后，**务必升级为 `p=quarantine`**；稳定后再考虑 `p=reject`。

2. **Save**

说明：

- `p=none` 仅收集报告，**不会拦截伪造邮件**（安全扫描会提示中风险）
- `p=quarantine` 将未通过验证的邮件放入垃圾箱；`p=reject` 直接拒收
- `rua` 会收到 XML 聚合报告（可忽略或交给监控工具）

验证：

```bash
dig TXT _dmarc.yuhaoapi.com +short
```

## 三、DKIM（通常无需再改）

Resend 已在根域配置 DKIM：

- **Name**：`resend._domainkey`
- 类型：TXT（公钥）

在 Resend → **Domains** → `yuhaoapi.com` 应显示 **Verified**。扫描器若写「未检查 DKIM」，是因未知 selector；实际 selector 为 `resend`。

验证：

```bash
dig TXT resend._domainkey.yuhaoapi.com +short
```

## 四、发信地址环境变量

生产环境建议：

```env
RESEND_FROM_EMAIL=noreply@yuhaoapi.com
RESEND_FROM_NAME=遇好API
```

Supabase SMTP / Send Email Hook 发件人亦应与 Resend 已验证域名一致。

## 五、一键检查脚本

DNS 改完后在项目根目录运行：

```bash
node scripts/check-dns-email-security.mjs yuhaoapi.com
```

全部通过后再跑一次外部安全扫描。

## 六、记录汇总

| 类型 | Name | 值（示例） |
|------|------|------------|
| TXT | `@` | `v=spf1 include:_spf.google.com include:amazonses.com ~all` |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@yuhaoapi.com; adkim=s; aspf=r` |
| TXT | `resend._domainkey` | （Resend 控制台已有，勿删） |
| TXT | `send` | `v=spf1 include:amazonses.com ~all`（Resend 已有，勿删） |
