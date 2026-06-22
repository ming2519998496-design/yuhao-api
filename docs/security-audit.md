# 安全审计清单（遇好API）

按六项优先级整理：**现状**、**测试方法**、**待办**。  
代码修复见 `supabase-security-hardening.sql`、`supabase-rate-limit.sql` 及对应 PR。

---

## 1. 越权与用户隔离

| 项 | 现状 | 如何测 |
|----|------|--------|
| A 用户不能操作 B 的 Key/账单/资料 | **通过**：API 均 `.eq("user_id", session.id)`；订单 `user_id` 校验 | 两账号登录，篡改 PATCH/DELETE `id`、订单 `orderNo` |
| 普通用户不能访问 `/api/admin/*` | **通过**：19 个 admin 路由均 `requireAdmin()` + 邮箱白名单 + DB role | 普通用户 curl admin 接口 → 403 |
| 冻结账号不能调用 | **已加固**：`requireActiveUser()` 覆盖控制台 API；API Key 鉴权含 `isUserFrozen` | 管理员冻结 A，A 仍带 session 调 `/api/keys`、v1 API → 403 |
| OAuth 回调冻结绕过 | **已修复**：`/auth/callback` 冻结则 signOut | 冻结用户走 magic link → 跳转 login?frozen=1 |
| Key PATCH/DELETE 伪造 ID | **已修复**：0 行更新返回 404 | 用 B 的 keyId 调 A 的 DELETE → 404 |
| 充值凭证 Storage 公开 URL | **待办**：bucket 仍 public，URL 可猜测 | 改私有桶 + 签名 URL 或 admin 代理 |
| RLS 暴露 `key_hash` | **部分**：已提供 `api_keys_safe` 视图 SQL，需 Revoke 直读 | 客户端直连 Supabase 查 `api_keys` |

---

## 2. 计费并发与重复请求

| 项 | 现状 | 如何测 |
|----|------|--------|
| 并发扣费不变负数 | **通过**：`reserve_balance` 使用 `WHERE balance >= amount` | 两请求同时 reserve 大于余额 → 一个失败 |
| 在线回调重复入账 | **通过**：`pending→completed` CAS + 已完成早退 | 重放 XorPay notify → 仅第一次入账 |
| 回调验签/金额 | **通过**：MD5 签名校验 + 金额比对；**已加固** timing-safe 比较 | 篡改 sign/amount → fail |
| 手动确认重复 | **通过**：同 CAS | 管理员连点确认 → `alreadyCompleted` |
| 入账后邀请失败回滚导致双充 | **已修复**：credit 与 referral 分离，失败只打日志不回滚 pending | 模拟 referral 失败 → 重试不双充 |
| 原子 credit | **已加固**：`credit_balance` RPC（见 hardening SQL） | 并发两笔充值入账 |
| 余额 CHECK >= 0 | **SQL 待执行**：`profiles_balance_non_negative` | SQL Editor 执行后验证 |
| 上游超时双扣/双 release | **待办**：无 reservation ledger，RPC 超时可能补偿 release | 压测 + 后续 reservation 表 |

---

## 3. API Key 生命周期

| 项 | 现状 |
|----|------|
| 库内仅存 hash + prefix | **通过** |
| 创建时仅返回一次明文 | **通过** |
| 列表不返回 hash/明文 | **通过**（服务端 select 安全列） |
| 吊销 `is_active` 立即生效 | **通过** |
| 冻结账户 Key 不可用 | **已加固**（`authenticateApiKeyRequest`） |
| v1 500 不泄露内部错误 | **已加固** |
| 每 Key 独立额度上限 | **待办**（当前账户共享余额） |
| Key 软删除/审计日志 | **待办** |

---

## 4. 防刷与成本控制

| 项 | 现状 |
|----|------|
| v1 API Key/User/IP 限流 | **已上线**（默认 60/120/180 每分钟） |
| 注册 OTP / IP | **已上线**（5 次/小时） |
| 体验金 / IP / 24h | **已上线**（3 次） |
| 请求体大小上限 | **通过**（chat 4MB） |
| 单用户日消费上限 | **待办** |
| Turnstile 人机验证 | **待办** |
| 上游失败无限重试 | **部分**（客户端需自行退避） |

---

## 5. 管理后台

| 项 | 现状 |
|----|------|
| `requireAdmin` + layout 守卫 | **通过** |
| 双管理员审批收款码 | **通过** |
| 冻结不可封禁其他管理员 | **通过** |
| 上游 Key 修改需密码 | **通过** |
| MFA / 会话超时 | **待办** |
| 管理操作审计日志 | **部分**（余额变动 log；无统一 admin audit） |
| 客服只读子角色 | **待办** |

---

## 6. 找回密码

| 项 | 现状 |
|----|------|
| Resend 直连（非 Hook） | **通过** |
| 不泄露邮箱是否注册 | **已修复**（统一成功文案） |
| IP + 邮箱限速 | **已加固** |
| OTP 一次性 / 短有效期 | **Supabase 默认**（约 5 分钟） |
| 改密后旧 session 失效 | **Supabase 默认** refresh 轮换 |
| 连续猜 OTP | **部分**（Supabase rate limit；可加 Turnstile） |

---

## 必做 SQL（Supabase SQL Editor）

按顺序执行（若未执行过）：

1. `supabase-signup-bonus.sql`
2. `supabase-rate-limit.sql`
3. `supabase-security-hardening.sql`

---

## 建议手工回归（两测试账号 A/B）

```bash
# 1. B 的 keyId 用 A 的 cookie 删改 → 404
# 2. B 的 orderNo 用 A 查询 → 404
# 3. 冻结 A 后：/api/keys、/api/v1/chat/completions → 403
# 4. 快速连发 v1 请求 → 429
# 5. 同一 IP 注册 4 个号领体验金 → 第 4 个无 ¥1
```

详细运维说明见 [security.md](./security.md)。
