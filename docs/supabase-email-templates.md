# Supabase 邮件模板（第二步完成后复制粘贴）

在 **Authentication → Email Templates** 中，将下列模板 **Subject + Body** 替换为以下内容（保留 `{{ .Token }}`）。

---

## 1. Confirm signup（注册验证码）— 必改

**Subject:** `遇好API 注册验证码`

**Body:**

```html
<h2>欢迎注册遇好API</h2>
<p>您的注册验证码是：</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px;">{{ .Token }}</p>
<p>请在 5 分钟内于注册页面输入此验证码完成验证。</p>
<p>如非本人操作，请忽略本邮件。</p>
```

---

## 2. Magic Link（邮箱 OTP 登录 / 找回密码发码）— 必改

找回密码使用邮箱验证码时，Supabase 常走此模板。

**Subject:** `遇好API 验证码`

**Body:**

```html
<h2>遇好API</h2>
<p>您的验证码是：</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px;">{{ .Token }}</p>
<p>请在 5 分钟内使用。如非本人操作，请忽略。</p>
```

---

## 3. Reset Password — 建议改

**Subject:** `遇好API 重置密码验证码`

**Body:** 与上面 Magic Link 相同（含 `{{ .Token }}`）

---

## 4. Change Email Address（修改邮箱）— 必改

**Subject:** `遇好API 更换邮箱验证码`

**Body:**

```html
<h2>更换绑定邮箱</h2>
<p>您正在更换遇好API账户邮箱，验证码为：</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px;">{{ .Token }}</p>
<p>请在 5 分钟内在「账户设置」页面输入。如非本人操作，请忽略。</p>
```

---

每改完一个模板点击 **Save**。
