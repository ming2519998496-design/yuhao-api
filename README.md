# 遇好API — AI 平台首页

企业级 AI API 平台落地页演示项目，基于 Next.js App Router + Tailwind CSS v4 + Framer Motion。

## 功能模块

- 营销首页、**邮箱 / 手机号**注册与登录、验证码找回密码  
- **邮箱验证码**：Resend + Supabase SMTP，见 [docs/resend-email-supabase.md](docs/resend-email-supabase.md)
- 用户后台 **账户设置**：修改邮箱/手机（向新联系方式发验证码）
- 用户前台：`/dashboard` 数据看板、`/console` API 密钥、`/recharge` 充值
- **管理后台** `/admin`：总览、用户管理、调用记录、**设置收款账户**
- 充值页读取管理员配置的支付宝 / 微信收款户名、账号与收款码

## 上线前清单

按顺序自测与迁移见 **[docs/launch-checklist.md](docs/launch-checklist.md)**；**每日进度勾选**见 **[docs/progress.md](docs/progress.md)**。本地可运行 `npm run check:db` 检查数据库表是否齐全。

## 管理后台

1. 在 Supabase **SQL Editor** 里 **Create a new snippet**，执行 **`supabase-run-all-in-sql-editor.sql`**（一键建表+安全加固）  
   - 逐步说明与界面用语见 [docs/supabase-sql-editor-only.md](docs/supabase-sql-editor-only.md)  
   - 再新建 snippet 执行 **`supabase-verify-in-sql-editor.sql`** 验证安全性  
   - 令牌管理需额外执行 **`supabase-api-key-models.sql`**（见同上文档）
2. 复制 `.env.example` 为 `.env.local`，填写 Supabase 密钥，并设置 `ADMIN_EMAILS=你的邮箱`
3. 使用该邮箱注册并登录，访问 [http://localhost:3000/admin](http://localhost:3000/admin)
4. 在「收款账户」中启用并填写支付宝 / 微信信息；收款码可**上传图片**或填写**图片链接**（二选一）
5. 若使用上传，在 Supabase 执行 `supabase-storage-payment.sql` 创建 `payment-qrcodes` 存储桶

## 开发

```bash
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

## 技术栈

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 4
- Framer Motion
- Lucide React
