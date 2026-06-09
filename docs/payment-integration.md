# 在线支付接入（XorPay 个人版 → 个体户/企业）

## 设计原则

- **配置驱动**：换个体户/企业 = 在 XorPay 重新进件 + 更新环境变量，业务代码与表结构不变。
- **订单快照**：每笔 `recharge_records` 写入当时的 `pay_provider`、`merchant_profile`、`merchant_id`，便于对账与审计。
- **人工兜底**：`source=manual` 上传凭证流程保留，在线支付未配置时可继续运营。

## 数据库

在 Supabase SQL Editor 执行：

```text
supabase-recharge-online-payment.sql
```

（已合并进 `supabase-run-all-in-sql-editor.sql` 末尾的可跳过重复执行。）

### 新增字段

| 字段 | 说明 |
|------|------|
| `source` | `manual` \| `online` |
| `pay_provider` | `xorpay`（未来可扩展 `pingpp` 等） |
| `merchant_profile` | 进件主体快照：`personal` \| `sole_trader` \| `enterprise` |
| `merchant_id` | 平台 App ID / 商户号快照 |
| `external_order_id` | XorPay `aoid` |
| `external_trade_id` | 微信/支付宝流水号 |
| `paid_amount` | 实付金额 |
| `pay_redirect_url` | 二维码/跳转链接 |
| `expired_at` | 在线订单过期时间 |
| `notify_count` | 回调次数 |
| `pay_meta` | 下单响应 JSON 快照 |

`status` 增加 `expired`（超时未付）。

## 环境变量

```env
# 在线支付总开关（未设 XORPAY 密钥时 create 接口会 503）
PAY_ONLINE_ENABLED=true
PAY_PROVIDER=xorpay
PAY_MERCHANT_PROFILE=personal

# XorPay 个人版（换个体户/企业后改 AID + SECRET，并改 PROFILE）
XORPAY_AID=你的aid
XORPAY_APP_SECRET=你的app_secret

# 回调域名（生产必填，用于拼 notify_url）
NEXT_PUBLIC_SITE_URL=https://你的域名
```

### 换主体 checklist

1. XorPay 后台完成新主体进件，拿到新 `aid` / `app_secret`。
2. 更新 Vercel / 服务器 env：`XORPAY_AID`、`XORPAY_APP_SECRET`、`PAY_MERCHANT_PROFILE=sole_trader` 或 `enterprise`。
3. 重新部署；**旧订单仍保留旧 `merchant_id` 快照**，新单自动用新配置。
4. 无需改表、无需迁移历史数据。

## API

### 创建在线订单

```http
POST /api/recharge/online/create
Content-Type: application/json
Cookie: （登录 session）

{ "amount": 50, "method": "wechat" }
```

`method`: `alipay` | `wechat`

响应示例：

```json
{
  "ok": true,
  "orderNo": "RC202605191430220001",
  "amount": 50,
  "method": "wechat",
  "payRedirectUrl": "weixin://...",
  "expiredAt": "2026-05-19T07:00:22.000Z",
  "merchantProfile": "personal",
  "payProvider": "xorpay"
}
```

前端展示 `payRedirectUrl` 为二维码或跳转；30 分钟内有效。

### 轮询订单状态

```http
GET /api/recharge/online/status?orderNo=RC...
```

返回 `record.status`：`pending` → `completed` / `expired`。

### 支付回调（XorPay 配置）

```text
通知 URL: https://你的域名/api/payment/notify/xorpay
```

验签：`MD5(aoid + order_id + pay_price + pay_time + app_secret)`  
成功须响应纯文本：`success`

回调成功后自动：`completeRechargeAndRewards`（余额 + 邀请首充规则）。

## 代码结构

```text
src/lib/payment/
  types.ts          # 类型与 provider 接口
  config.ts         # 读 env，merchant_profile
  xorpay.ts         # XorPay 下单 + 验签
  provider.ts       # 当前生效 provider
  complete-online-recharge.ts  # 回调入账

src/lib/recharge-records-db.ts  # createOnlinePendingRechargeRecord 等
src/app/api/recharge/online/create/route.ts
src/app/api/recharge/online/status/route.ts
src/app/api/payment/notify/xorpay/route.ts
```

## 本地验证

```bash
cd /Users/lming/ai-api-platform && npm run check:db
```

确认 `recharge_records.source` 等列存在。

XorPay 沙箱/正式需公网可访问的 `notify_url`；本地开发可用 ngrok 等隧道。

## 参考

- [XorPay 回调文档](https://xorpay.com/doc/notify.html)
- 人工充值：`POST /api/recharge/records`（不变）
