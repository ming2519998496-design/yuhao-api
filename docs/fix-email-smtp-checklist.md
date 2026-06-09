# 注册发信失败排查清单（Error sending confirmation email）

## SMTP 一直超时、但 `test-resend-smtp.mjs` 成功？

说明 **Resend 正常、Supabase SMTP 不通**。请改用 **Send Email Hook**（Resend API 发信）：

详见 **[resend-send-email-hook.md](./resend-send-email-hook.md)**（需 ngrok 或已部署公网域名）。

---

## 改完仍失败：先做「重置 SMTP」再测

Supabase 已知问题：曾保存过**错误**的 Custom SMTP 后，即使改对也可能继续失败。

1. Authentication → Email → SMTP：**关闭** Enable Custom SMTP → **Save**  
2. 等 10 秒，再**打开** Custom SMTP，逐项重填（见下表）→ **Save**  
3. 再注册试一次  

本地可测 Resend 是否正常（与 Supabase 无关）：

```bash
# .env.local 临时加 RESEND_API_KEY 和 TEST_EMAIL_TO
node scripts/test-resend-smtp.mjs
```

- 脚本**成功**、注册仍失败 → 几乎确定是 Supabase SMTP 未保存对  
- 脚本也**失败** → Resend Key 或收件邮箱未在 Resend 允许列表  

**无域名时**：`onboarding@resend.dev` 只能发到你在 Resend 账号里**已验证/添加过**的收件邮箱；用别的 QQ 邮箱注册会失败。

错误来自 **Supabase 发邮件失败**，与网站代码、数据库迁移无关。

## 第一步：看 Resend 有没有记录（30 秒）

1. 打开 https://resend.com/emails  
2. 再试一次注册  
3. 刷新 Logs  

| Logs 情况 | 说明 |
|-----------|------|
| **完全没有** 新记录 | Supabase 没连上 Resend → 查 SMTP 账号密码、Host、是否 Save |
| **有记录且 Failed** | 点进去看原因（发件人未验证、域名未验证等） |
| **有记录且 Delivered** | 去垃圾箱；或收件邮箱填错 |

## 第二步：核对 Supabase SMTP（Authentication → Email）

路径：https://supabase.com/dashboard/project/loppdowrbhyoeuqgrfif/auth/smtp

| 项 | 必须 |
|----|------|
| Enable Custom SMTP | ✅ 开 |
| Host | `smtp.resend.com` |
| Port | `465`（不行改 `587` 再 Save 试） |
| Username | `resend`（小写） |
| Password | Resend **API Key**（`re_` 开头，重新复制，无空格） |
| Sender email | 见下方 |
| Sender name | 任意，如 `遇好API` |

**Sender email 二选一：**

- **有已验证域名**：`noreply@你的域名.com`（在 Resend → Domains 为 Verified）  
- **没有域名（开发）**：`onboarding@resend.dev`，且**注册用的收件邮箱**要在 Resend 里验证过（Resend → 添加测试邮箱）

❌ 不要用 `2519998496@qq.com` 当发件人（未在 Resend 验证会失败）。

改完务必点 **Save**，等 10 秒再注册。

## 第三步：Supabase Auth 日志

https://supabase.com/dashboard/project/loppdowrbhyoeuqgrfif/auth/logs

找失败时间附近的 **signup**，展开看 `smtp` / `550` / `authentication` 等字样。

## 第四步：邮件模板（一般不是本错误原因）

Authentication → **Email Templates** → **Confirm signup** 正文含 `{{ .Token }}`。

## 第五步：仍失败时

1. Resend 新建 API Key（Sending access）→ 替换 Supabase Password → Save  
2. Port 465 ↔ 587 各试一次  
3. 注册邮箱改用你在 Resend 验证过的邮箱  

---

把下面三项发协助排查（不要发 API Key）：

1. Supabase SMTP 里的 **Sender email** 填的是什么  
2. Resend Logs：有没有记录？状态？  
3. Auth Logs 里该条错误的 **一行英文详情**
