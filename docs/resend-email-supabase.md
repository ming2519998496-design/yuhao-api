# 邮箱验证码开通指南（Resend + Supabase）

邮件由 **Supabase Auth** 发出，通过 **Resend SMTP** 投递。  
API Key 只填在 **Supabase 网页后台**，不要写进代码，也不要发给他人。

---

## 一、在 Resend 创建 API Key（这就是 Supabase 里的「邮件密码」）

1. 打开 https://resend.com 并登录（可用 GitHub 注册）
2. 左侧菜单点 **API Keys**
3. 点 **Create API Key**
4. 名称随意，例如：`supabase-yuhao-api`
5. Permission 选 **Sending access**（发送权限即可）
6. Domain 选 **All domains** 或你之后要验证的域名
7. 点 **Create**
8. **立刻复制** 以 `re_` 开头的密钥（只显示一次）  
   - 示例形态：`re_123abc...`  
   - 这就是后面填到 Supabase **Password** 里的内容

### 可选：查看 SMTP 固定参数

左侧 **SMTP**（或 https://resend.com/settings/smtp ）页面会列出：

| 参数 | 固定值 |
|------|--------|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | **你的 API Key**（`re_` 开头） |

---

## 二、发件邮箱（Sender email）怎么填？

Supabase 要求 **Sender email** 必须是 Resend 允许的发信地址。

### 方式 A：有自己的域名（正式环境推荐）

1. Resend → **Domains** → **Add Domain**
2. 按提示在域名 DNS 添加 TXT / MX 等记录
3. 状态变为 **Verified** 后  
4. Sender email 填：`noreply@你的域名.com` 或 `support@你的域名.com`

### 方式 B：开发测试（暂无域名）

1. 在 Resend 先添加并验证一个**你自己的收件邮箱**（用于测试收信）
2. Sender 可尝试 Resend 文档示例：`onboarding@resend.dev`  
3. 若 Supabase 保存报错，说明必须先完成 **Domains** 验证，再改用 `xxx@已验证域名`

> 收信测试：注册时用你在 Resend 验证过的邮箱，更容易在开发期收到邮件。

---

## 三、在 Supabase 填写 SMTP（详细步骤）

### 进入配置页（任选一种路径）

**路径 1（推荐，新版界面）**

1. 打开 https://supabase.com/dashboard
2. 点击你的项目（例如 `loppdowrbhyoeuqgrfif` 对应项目）
3. 左侧 **Authentication**
4. 在 **NOTIFICATIONS** 区域点 **Email**
5. 找到 **SMTP Settings** 区域

**路径 2**

1. 左侧 **Project Settings**（齿轮图标）
2. 左侧子菜单 **Authentication**
3. **SMTP Settings**

### 逐项填写

| 表单项 | 填什么 | 说明 |
|--------|--------|------|
| **Enable Custom SMTP** | 打开 ✅ | 必须开启，否则用 Supabase 默认邮件（易限流） |
| **Sender email** | `noreply@你的域名` | 须在 Resend 已验证；开发可试 `onboarding@resend.dev` |
| **Sender name** | `遇好API` | 收件人看到的发件人名称 |
| **Host** | `smtp.resend.com` | 固定 |
| **Port** | `465` | 固定（SSL） |
| **Username** | `resend` | 固定，不是邮箱地址 |
| **Password** | 粘贴 `re_...` API Key | **不是** Supabase 密码，是 Resend API Key |

6. 点 **Save** 保存

### 填写示意

```
Enable Custom SMTP:  ON
Sender email:        noreply@example.com
Sender name:         遇好API
Host:                smtp.resend.com
Port:                465
Username:            resend
Password:            re_xxxxxxxxxxxxxxxx   ← Resend API Key
```

---

## 第二步已完成？请继续第三～五步

SMTP 保存成功后，按顺序做：

1. **[邮件模板](./supabase-email-templates.md)** — 复制 4 个模板（含 `{{ .Token }}`）  
2. **Sign In / Providers** — 见下方「第四步（新版界面）」  
3. **URL Configuration** — Site URL `http://localhost:3003`  
4. 本地 `npm run dev:clean` 后测试注册页  

---

## 四、开启邮箱登录与验证码（新版 Supabase 界面）

> 旧文档里的「Enable Email provider / Enable Email OTP」在新版里**往往没有单独开关**。邮箱登录默认已开启；**6 位验证码靠邮件模板里的 `{{ .Token }}`**，不是靠再开一个 OTP 开关。

### 你要找的项 → 实际在哪

| 以前写的名字 | 新版里怎么找 |
|-------------|-------------|
| Enable Email provider | **不用找**。左侧 **Authentication** → **Sign In / Providers**，列表里有 **Email** 且能点进去即可 |
| Confirm email | 在 **Sign In / Providers** 页面**顶部**的通用设置里，英文 **Confirm email**（注册需验证邮箱） |
| Secure email change | 点进 **Email** 提供商详情页里的开关（见下） |
| Enable Email OTP | **没有此项**。在 **Email Templates → Magic Link** 里加 `{{ .Token }}` 即表示发 OTP |

### 操作步骤

1. 打开：`https://supabase.com/dashboard/project/你的项目ID/auth/providers`
2. 页面**上方**（所有登录方式共用）确认：
   - **Allow new users to sign up** — 开启（否则无法注册）
   - **Confirm email** — 建议开启（注册后发验证码）
3. 在提供商列表中点击 **Email**（或地址栏变成 `.../auth/providers?provider=Email`）
4. 在 Email 详情里按需开启 **Secure email change**（换邮箱要验证；找不到可跳过，不影响注册测试）
5. 若仍没有 **Confirm email**：它可能已在 hosted 项目**默认开启**，可直接做第三步邮件模板 + 注册测试

### 和「第四步」容易混淆的菜单

- **NOTIFICATIONS → Email** = 只配 **SMTP**（你第二步已完成）
- **Email Templates** = 第三步模板（含 `{{ .Token }}`）
- **Sign In / Providers** = 本节的注册/确认开关

### Email Templates（必须含 6 位验证码）

1. **Authentication** → **Email Templates**
2. 编辑 **Confirm signup**（注册确认），正文改为例如：

```html
<h2>遇好API 注册验证</h2>
<p>您的验证码是：<strong>{{ .Token }}</strong></p>
<p>请在 5 分钟内完成验证。如非本人操作请忽略。</p>
```

3. 同样修改 **Reset Password**（找回密码）、**Change Email Address**（修改邮箱）  
   - 正文中必须有：`{{ .Token }}`  
   - 若只有「点击链接」没有 `{{ .Token }}`，页面无法输入 6 位验证码

4. 每个模板改完后点 **Save**

---

## 五、URL 配置

**Authentication** → **URL Configuration**：

| 项 | 开发环境填写 |
|----|----------------|
| Site URL | `http://localhost:3003` |
| Redirect URLs | `http://localhost:3003/**` |

保存。

---

## 六、网站侧测试

1. 本地重启：`npm run dev:clean`
2. 打开 http://localhost:3003/register
3. 选择 **邮箱**，填写姓名、邮箱、密码
4. 点 **发送邮箱验证码**
5. 到邮箱（含垃圾箱）查 6 位数字
6. 在页面输入验证码 → **完成注册**

其他：

- 找回密码：http://localhost:3003/forgot-password（邮箱）
- 修改邮箱：登录后 → **账户设置**

---

## 七、怎么确认配置成功？

| 检查点 | 位置 |
|--------|------|
| Supabase SMTP 已保存 | Authentication → Email → SMTP Settings 无报错 |
| Resend 有发送记录 | Resend → **Emails** / **Logs** 出现 outbound |
| 邮件内容有 6 位数字 | 模板含 `{{ .Token }}` |
| 网站注册页能进入验证码步骤 | 提交注册后出现输入框 |

---

## 八、常见报错

| 报错 / 现象 | 原因 | 处理 |
|-------------|------|------|
| **Error sending confirmation email** | Custom SMTP 未生效、发件地址非法、API Key 错 | 见下方「确认邮件发送失败」专节 |
| SMTP authentication failed | API Key 错或复制带空格 | 重新创建 Key，完整粘贴到 Password |
| Sender email not verified | 发件域名未在 Resend 验证 | Domains 里验证域名，或换合法发件地址 |
| 收不到邮件 | 进垃圾箱 / Resend 限流 / 收件邮箱未验证 | 看 Resend Logs；换已验证邮箱测试 |
| 邮件只有链接没有数字 | 模板没改 | 模板加入 `{{ .Token }}` |
| Signups not allowed for otp | 与短信有关，不是邮箱 | 邮箱流程不依赖此项 |

### 「Error sending confirmation email」逐步排查

注册点「发送邮箱验证码」时，Supabase 在 `signUp` 后调用邮件服务；**Providers 开关没问题也会报这个错**，几乎都是 **SMTP / 发件人** 问题。

1. **确认 Custom SMTP 真的开着**  
   `Authentication` → `Email`（NOTIFICATIONS）→ **Enable Custom SMTP** ✅ → **Save**（改完务必再点一次保存）

2. **核对 Resend 五项（最常见）**

   | 字段 | 正确值 |
   |------|--------|
   | Host | `smtp.resend.com` |
   | Port | `465`（不行再试 `587`） |
   | Username | `resend`（小写，不是邮箱） |
   | Password | 完整 `re_...` API Key（无空格、无引号） |
   | Sender email | 见第 3 步 |

3. **Sender email 必须合法（最高频原因）**  
   - 有域名：在 Resend **Domains** 验证通过后，用 `noreply@你的域名`  
   - 无域名：Sender 填 `onboarding@resend.dev`，且**注册用的收件邮箱**要在 Resend 里作为测试联系人验证过  
   - 不要用随意 QQ/163 当 Sender（未验证域名会直接被拒）

4. **看日志拿真实原因**  
   - Resend Dashboard → **Logs**：若完全没有记录 → Supabase 没连上 SMTP（Key/Host 错）  
   - Supabase → **Authentication** → **Logs**：展开失败事件，常有 `smtp`、`550`、`authentication failed`

5. **曾填错过 SMTP 时**  
   重新填入正确 Key → Save → 再试注册；必要时新建一个 Resend API Key 再粘贴

6. **与模板无关**  
   模板缺 `{{ .Token }}` 只会导致「邮件里没有数字」，一般不会报 `Error sending confirmation email`

---

## 九、安全提醒

- API Key 等同于邮件发送密码，**不要提交到 Git**，不要发给他人
- 只需填在 Supabase 网页，**本项目 `.env.local` 不必配置 `RESEND_API_KEY`**（当前架构）

---

## 十、与手机短信的关系

邮箱认证与 `ALIYUN_*`、Send SMS Hook 无关。  
短信开通见 [aliyun-sms-supabase.md](./aliyun-sms-supabase.md)。
