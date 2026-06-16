# 安全说明

## 数据库加固（必做）

在 Supabase **SQL Editor** 里 **Create a new snippet** 并 **Run** [`supabase-security-fix.sql`](../supabase-security-fix.sql)（步骤见 [supabase-sql-editor-only.md](./supabase-sql-editor-only.md)），用于：

| 风险 | 修复 |
|------|------|
| 客户端篡改 `api_keys.balance` | 移除 INSERT/UPDATE/DELETE 策略 + 触发器保护敏感列 |
| `deduct_balance` 被滥用或负数加余额 | 校验 `p_amount > 0`，仅 `service_role` 可执行 |
| 用户自行把 `profiles.role` 改为 `admin` | 触发器禁止非 service_role 修改 role |
| 伪造 `usage_logs` | 移除客户端 INSERT 策略 |

新建项目请直接使用更新后的 `supabase-schema.sql` / `supabase-admin-schema.sql` / `supabase-functions.sql`，再按需执行 security-fix（幂等，可重复执行）。

**API 冻结计费**（`/v1/chat/completions`）：另在 SQL Editor 执行 [`supabase-billing-reserve.sql`](../supabase-billing-reserve.sql)（或 `npm run db:setup` 已包含），提供 `reserve_balance` / `settle_balance` / `release_balance`。Agent / tools 兼容说明见 [api-compatibility.md](./api-compatibility.md)。

## 方案 A：本地一键执行

1. Supabase 项目页顶部 **Connect** → 复制 **Session pooler** 或 **Direct** 的 URI（不在 Database → Settings 里）  
2. `.env.local` 增加 `DATABASE_URL=postgresql://...`（勿提交 Git）  
3. 终端执行：

```bash
npm run db:setup    # 执行全部 SQL
npm run db:verify   # 自动验证 RLS / 扣费函数 / 触发器
```

## 应用层

- 管理接口：`requireAdmin()`（`src/lib/auth-admin.ts`）
- API Key / 扣费：仅服务端 `SUPABASE_SERVICE_ROLE_KEY`
- 短信 Hook：`SUPABASE_SEND_SMS_HOOK_SECRET` + Standard Webhooks 签名校验

## 浏览器安全响应头

页面 CSP 与 CORS 在 [`src/middleware.ts`](../src/middleware.ts) 中配置（定义见 [`src/lib/security-headers.ts`](../src/lib/security-headers.ts)、[`src/lib/cors.ts`](../src/lib/cors.ts)）：

| 项 | 说明 |
|----|------|
| `Content-Security-Policy` | 生产环境已去掉 `unsafe-eval`；每请求注入 `nonce` |
| `Access-Control-Allow-Origin` | API 仅允许 `ALLOWED_ORIGINS` 白名单，禁止 `*` |
| `X-Frame-Options: DENY` | 防点击劫持 |
| `Strict-Transport-Security` | 强制 HTTPS |

环境变量（可选）：

```env
NEXT_PUBLIC_SITE_URL=https://yuhaoapi.com
ALLOWED_ORIGINS=https://yuhaoapi.com,https://www.yuhaoapi.com
```

部署后可用浏览器开发者工具 → Network → 任意文档请求 → Response Headers 核对。

## 邮件域 SPF / DMARC

扫描若提示「DMARC 仍为监控模式」，在 Cloudflare 将 `_dmarc` 的 `p=none` 升级为 `p=quarantine`（见 [dns-email-security.md](./dns-email-security.md)）。改完后运行：

```bash
node scripts/check-dns-email-security.mjs yuhaoapi.com
```

## 待办（非本次严重项）

- 收款配置 JSON 勿与公开二维码同桶（见审计「高」级项）
- 为 `/admin` 增加 `middleware.ts` 会话校验
- Chat API 速率限制与原子扣费
