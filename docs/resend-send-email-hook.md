# Send Email Hook 详细配置（绕过 SMTP 超时）

适用：终端 `node scripts/test-resend-smtp.mjs` **已成功**，但网站注册仍 **SMTP 超时**。

原理：Supabase 不再用 SMTP，改为 **HTTP 调用你本地/服务器上的接口**，由 **Resend API** 发信（与测试脚本相同）。

---

## 第 0 步：确认本地已有 Resend Key

打开 `ai-api-platform/.env.local`，应有一行（你已有可跳过）：

```env
RESEND_API_KEY=re_你的密钥
```

---

## 第 1 步：安装 ngrok（只需一次）

Mac 任选一种：

**A. 官网（推荐）**

1. 打开 https://ngrok.com/download  
2. 下载 Mac 版，按提示安装  
3. 注册账号后，在控制台复制 **Authtoken**  
4. 终端执行（把 token 换成你的）：

```bash
ngrok config add-authtoken 你的_authtoken
```

**B. Homebrew**

```bash
brew install ngrok
ngrok config add-authtoken 你的_authtoken
```

---

## 第 2 步：启动网站（终端 1）

```bash
cd /Users/lming/ai-api-platform
npm run dev:clean
```

看到 `Local: http://localhost:3003` 和 `Ready` 后**不要关这个终端**。

---

## 第 3 步：启动 ngrok（终端 2，新开一个）

```bash
ngrok http 3003
```

界面里找到 **Forwarding**，例如：

```text
Forwarding   https://a1b2c3d4.ngrok-free.app -> http://localhost:3003
```

复制 **`https://` 开头** 那一串（不要带路径），例如：`https://a1b2c3d4.ngrok-free.app`

你的 Hook 地址是（把域名换成你的）：

```text
https://a1b2c3d4.ngrok-free.app/api/auth/hook/send-email
```

**两个终端都要一直开着**（关了就注册不了）。

---

## 第 4 步：在 Supabase 配置 Send Email Hook

1. 浏览器打开：  
   https://supabase.com/dashboard/project/loppdowrbhyoeuqgrfif/auth/hooks  

2. 找到 **Send Email** 区块  

3. 打开 **Enable Hook**（或类似「启用」开关）  

4. 类型选择：**HTTP Endpoint**（不是 Postgres 函数）  

5. **URL** 粘贴（务必包含 `/api/auth/hook/send-email`）：  
   `https://你的ngrok域名/api/auth/hook/send-email`  

6. 点击生成 **Secret** / **Generate secret**，复制整串，形如：  
   `v1,whsec_xxxxxxxxxxxxxxxx`  

7. 点 **Save** / **保存**

> 若之后重启 ngrok，免费版域名会变，需要回来 **改 URL 再 Save**。

---

## 第 5 步：把 Secret 写入 `.env.local`

在 Cursor 打开 `.env.local`，**新增一行**（Secret 用第 4 步复制的，不要加引号）：

```env
SUPABASE_SEND_EMAIL_HOOK_SECRET=v1,whsec_粘贴这里
```

保存（`Cmd + S`）。

---

## 第 6 步：重启网站

回到**终端 1**（跑 dev 的那个）：

1. 按 `Ctrl + C` 停掉  
2. 再执行：

```bash
npm run dev:clean
```

（ngrok 终端 2 **不要关**。）

---

## 第 7 步：关闭 Custom SMTP（建议）

1. 打开：https://supabase.com/dashboard/project/loppdowrbhyoeuqgrfif/auth/smtp  
2. **Authentication** → **Email** → **SMTP Settings**  
3. **关掉** Enable Custom SMTP  
4. **Save**

避免 SMTP 和 Hook 同时抢发信导致超时。

---

## 第 8 步：确认 URL 配置

https://supabase.com/dashboard/project/loppdowrbhyoeuqgrfif/auth/url-configuration  

| 项 | 值 |
|----|-----|
| Site URL | `http://localhost:3003` |
| Redirect URLs | `http://localhost:3003/**` |

保存。

---

## 第 9 步：测试注册

1. 浏览器打开：http://localhost:3003/register  
2. 选 **邮箱**  
3. 邮箱填：**ming2519998496@gmail.com**（测试期不要用 QQ）  
4. 点发送验证码 / 注册  

**成功表现：**

- 页面进入「输入 6 位验证码」  
- Gmail 收到验证码邮件（含垃圾箱）  
- Resend → Emails 有新记录  

**失败时：**

- 看 Cursor **终端 1** 有没有 `[send-email hook]` 报错  
- Supabase → Authentication → **Logs**  
- 确认 ngrok 没关、Hook URL 与当前 ngrok 域名一致  

---

## 常见问题

| 现象 | 处理 |
|------|------|
| Supabase 仍超时 | ngrok 是否运行；Hook URL 是否最新；是否重启过 `npm run dev:clean` |
| 401 签名校验失败 | `.env.local` 的 Secret 与 Supabase Hook 里不一致 |
| 500 未配置 SECRET | 补 `SUPABASE_SEND_EMAIL_HOOK_SECRET` 并重启 dev |
| 500 Resend 403 | 收件人必须用 `ming2519998496@gmail.com`，直到验证自有域名 |
| 换了 ngrok 域名 | 回 Supabase Hooks 更新 URL 并 Save |

---

## 上线后（以后有正式域名）

1. 把网站部署到服务器  
2. Hook URL 改为：`https://你的正式域名/api/auth/hook/send-email`  
3. 服务器环境变量配置 `RESEND_API_KEY`、`SUPABASE_SEND_EMAIL_HOOK_SECRET`  
4. 在 Resend 验证域名后，可把发件人改为 `noreply@你的域名`（改 `src/lib/resend-auth-email.ts` 里的 `FROM`）
