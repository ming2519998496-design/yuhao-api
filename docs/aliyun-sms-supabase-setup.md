# 阿里云短信 + Supabase 配置指南

将你在阿里云已有的验证码短信，接到本站手机注册/登录/绑定流程。

---

## 一、从阿里云控制台获取 4 项信息

登录 [阿里云短信控制台](https://dysmsapi.console.aliyun.com/)

| 环境变量 | 在阿里云哪里找 |
|----------|----------------|
| `ALIYUN_ACCESS_KEY_ID` | 右上角头像 → AccessKey 管理 → 创建/查看 AccessKey ID |
| `ALIYUN_ACCESS_KEY_SECRET` | 同上 AccessKey Secret（只显示一次，请保存） |
| `ALIYUN_SMS_SIGN_NAME` | 国内消息 → **签名管理** → 已审核通过的签名名称 |
| `ALIYUN_SMS_TEMPLATE_CODE` | 国内消息 → **模板管理** → 验证码类模板的 **模板 CODE**（如 `SMS_123456789`） |

### 模板变量名

验证码模板里的变量名需与代码一致，默认为 **`code`**。

- 若模板内容是：`您的验证码为${code}` → 无需改
- 若变量名是 `verification_code` 等，在 `.env.local` 增加：
  ```env
  ALIYUN_SMS_TEMPLATE_PARAM_KEY=verification_code
  ```

---

## 二、配置项目 `.env.local`

在项目根目录 `.env.local` 追加：

```env
# 阿里云短信
ALIYUN_ACCESS_KEY_ID=你的AccessKeyId
ALIYUN_ACCESS_KEY_SECRET=你的AccessKeySecret
ALIYUN_SMS_SIGN_NAME=你的短信签名
ALIYUN_SMS_TEMPLATE_CODE=SMS_xxxxxx
# 可选，模板变量名不是 code 时填写
# ALIYUN_SMS_TEMPLATE_PARAM_KEY=code

# Supabase Send SMS Hook 密钥（下一步在 Supabase 生成）
SUPABASE_SEND_SMS_HOOK_SECRET=v1,whsec_xxxxxxxx
```

重启开发服务器：`npm run dev:clean`

---

## 三、配置 Supabase Send SMS Hook

Supabase 在需要发短信时会 **POST 到你的网站**，由网站再调阿里云。

### 1. 准备公网可访问的 Hook 地址

| 环境 | Hook URL |
|------|----------|
| 本地开发 | 用 [ngrok](https://ngrok.com/) 等：`https://xxxx.ngrok-free.app/api/auth/hook/send-sms` |
| 已部署生产 | `https://你的域名/api/auth/hook/send-sms` |

本地示例：

```bash
ngrok http 3003
# 复制 https 地址，末尾加上 /api/auth/hook/send-sms
```

### 2. 在 Supabase 启用 Hook

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目  
2. **Authentication** → **Hooks**（或 **Auth Hooks**）  
3. 找到 **Send SMS**，点击启用  
4. **HTTP Endpoint** 填上一步的完整 URL  
5. 生成 **Hook Secret**，复制形如 `v1,whsec_xxxx` 的字符串  
6. 将 Secret 写入 `.env.local` 的 `SUPABASE_SEND_SMS_HOOK_SECRET`  
7. 保存后 **重启** 本地 `npm run dev`

### 3. 开启 Phone 并关闭内置 Twilio

**Authentication** → **Providers** → **Phone**：

- ✅ Enable phone provider  
- ❌ 不要填 Twilio（已用 Hook 发阿里云）  
- ✅ 建议开启 **Secure phone change**  
- 本地测试可配置 **Test OTP**（不经过阿里云）

---

## 四、验证是否成功

1. 登录网站 → **账户设置** → 修改绑定手机  
2. 输入新手机号 → **获取验证码**  
3. 手机应收到阿里云短信（6 位验证码与页面一致）  
4. 输入验证码 → **确认更换**

若失败：

- 看终端/服务器日志 `[send-sms hook]`  
- Supabase → **Logs** → Auth  
- 阿里云控制台 → 发送记录

---

## 五、常见问题

| 错误 | 处理 |
|------|------|
| `Unable to get SMS provider` | 未启用 Send SMS Hook 或未填 Hook URL |
| `签名校验失败` | `SUPABASE_SEND_SMS_HOOK_SECRET` 与 Supabase Hook Secret 不一致 |
| `isv.BUSINESS_LIMIT_CONTROL` | 阿里云流控/余额/签名模板问题，查控制台发送记录 |
| `InvalidSignName` | 签名未审核或与 `ALIYUN_SMS_SIGN_NAME` 不一致 |
| `InvalidTemplateCode` | 模板 CODE 错误或未审核 |
| ngrok 收不到请求 | Hook URL 必须是 **https** 且路径完整 |

---

## 六、流程示意

```
用户点击「获取验证码」
    → Supabase Auth 生成 OTP
    → POST 你的网站 /api/auth/hook/send-sms
    → 校验 Hook 签名
    → 调用阿里云 SendSms API
    → 用户手机收到短信
    → 用户在页面输入 OTP
    → Supabase verifyOtp 完成绑定
```
