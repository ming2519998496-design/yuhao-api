# Supabase 认证配置（邮箱 + 手机号）

## 1. 启用登录方式

Supabase Dashboard → **Authentication** → **Providers**

| 方式 | 配置 |
|------|------|
| Email | 开启 Email；建议开启 **Confirm email**（注册需邮箱验证码） |
| Phone | 开启 Phone；**必须**配置 SMS 服务商，否则会出现 `Unable to get SMS provider` |

**短信服务商详细对比与配置** → 见 [supabase-sms-providers.md](./supabase-sms-providers.md)

**说明**：修改/绑定手机号使用 `updateUser` 发验证码。未配置 Twilio / Hook 时无法发真实短信；开发可用 **Test OTP** 固定验证码。

## 2. 验证码模板（OTP）

**Authentication** → **Email Templates**：确认注册/找回密码邮件包含 `{{ .Token }}` 六位验证码。

**Authentication** → **Phone**：配置短信模板，用于注册、找回密码、更换手机号。

## 3. 站点 URL

**Authentication** → **URL Configuration**

- Site URL: `http://localhost:3003`（生产环境改为正式域名）
- Redirect URLs: 添加 `http://localhost:3003/**`

## 4. 功能与页面对应

| 功能 | 路径 |
|------|------|
| 邮箱/手机注册 | `/register` |
| 邮箱/手机登录 | `/login` |
| 忘记密码（验证码） | `/forgot-password` |
| 修改邮箱/手机 | `/dashboard/settings` |

## 5. 数据库

执行 `supabase-admin-schema.sql`（含 `profiles.phone`）。若表已存在，可只执行 `supabase-auth-migration.sql`。
