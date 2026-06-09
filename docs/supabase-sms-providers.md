# 短信验证码服务商说明（Supabase 手机绑定/注册）

## 为什么会出现 `Unable to get SMS provider`？

Supabase **本身不发短信**，只负责生成验证码。你必须在后台配置一家 **SMS 网关**，Supabase 才能把验证码发到用户手机。

未配置时，绑定手机、手机注册、找回密码等都会失败。

---

## 你需要准备什么？

| 项目 | 说明 |
|------|------|
| 短信服务商账号 | 见下方供应商列表 |
| API 密钥 | Account SID / Auth Token（Twilio）或 AccessKey（国内云） |
| 短信签名 + 模板 | 国内号码通常需在运营商/云平台备案审核 |
| Supabase 配置 | Dashboard → Authentication → **Providers** → **Phone** |

---

## 方案一：Twilio（Supabase 官方内置，推荐先接入）

**适合**：快速上线、有海外用户，或先打通流程再换国内通道。

| 项目 | 信息 |
|------|------|
| 官网 | https://www.twilio.com |
| 文档 | https://www.twilio.com/docs/sms |
| Supabase 文档 | https://supabase.com/docs/guides/auth/phone-login |
| 计费 | 按条计费，发往中国大陆约 $0.05–0.08/条（以官网为准） |
| 发往 +86 | 支持，但需完成 Twilio 合规与可能的企业认证 |

**Supabase 配置步骤**：

1. 注册 Twilio，创建 **Messaging Service** 或购买号码  
2. 记录：**Account SID**、**Auth Token**、**Message Service SID**（或 From 号码）  
3. Supabase → **Authentication** → **Providers** → **Phone** → 选 **Twilio**  
4. 填入上述凭证，保存  
5. 本地开发可在 **Phone** 设置里配置 **Test OTP**（指定手机号固定验证码，不真发短信）

---

## 方案二：MessageBird / Vonage（Supabase 内置备选）

| 供应商 | 官网 | 说明 |
|--------|------|------|
| MessageBird | https://www.messagebird.com | 欧洲/全球，Dashboard 可选 |
| Vonage | https://www.vonage.com | 原 Nexmo，全球短信 |

配置位置与 Twilio 相同：Supabase → Phone → 选择对应 Provider 并填 API Key。

---

## 方案三：国内短信（阿里云 / 腾讯云）— 用户主要在大陆时推荐

**适合**：遇好API 用户以 **+86 手机号** 为主，到达率、价格、合规通常更好。

Supabase **控制台不直接填阿里云密钥**，需用 **Send SMS Hook**（自定义发短信接口）：

| 供应商 | 官网 | 产品 |
|--------|------|------|
| 阿里云 | https://www.aliyun.com/product/sms | 短信服务 SMS |
| 腾讯云 | https://cloud.tencent.com/product/sms | 短信 SMS |
| 华为云 | https://www.huaweicloud.com/product/msgsms.html | 消息&短信 |

**大致流程**：

1. 在云厂商开通短信、申请 **签名**、**模板**（验证码类）  
2. 获取 **AccessKey** + **模板 ID**  
3. Supabase → **Authentication** → **Hooks** → **Send SMS**  
4. 填写你的 HTTPS 接口地址（需自行实现：接收 Supabase 请求 → 调云厂商 API 发短信）  
5. 或使用 Edge Function / 本项目后续可加的 `/api/auth/send-sms` 路由  

**阿里云已支持**：见 [aliyun-sms-supabase-setup.md](./aliyun-sms-supabase-setup.md)，Hook 地址为 `/api/auth/hook/send-sms`。

---

## 方案对比（简要）

| 方案 | 接入难度 | 国内 +86 到达率 | Supabase 内置 |
|------|----------|-----------------|---------------|
| Twilio | ⭐ 简单 | 中（需合规） | ✅ |
| MessageBird / Vonage | ⭐⭐ | 中 | ✅ |
| 阿里云 / 腾讯云 + Hook | ⭐⭐⭐ | 高 | 需 Hook |
| 开发测试 Test OTP | ⭐ 最简单 | 不发真短信 | ✅ |

---

## 开发阶段建议（不花钱先测流程）

Supabase → **Authentication** → **Providers** → **Phone**：

- 开启 **Enable phone provider**  
- 在 **Test Phone Numbers and OTPs** 添加，例如：  
  `+8613800138000` → `123456`  
- 用该号码在「账户设置」里绑定，验证码填 `123456`，无需真实短信

---

## 请你确认的选择

回复下面任一即可，便于下一步配置或写 Hook：

1. **Twilio**（最快，国际官方支持）  
2. **阿里云短信**（国内主力）  
3. **腾讯云短信**（国内主力）  
4. 仅 **Test OTP** 先联调，正式上线再选 1/2/3  

确认供应商后，可提供：该厂商控制台要填的字段清单 + Supabase 每项对应关系 +（如需要）项目内 Send SMS Hook 实现。
