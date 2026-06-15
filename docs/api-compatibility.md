# API 兼容说明

面向 Agent、工具调用（tools）与长上下文场景的接入须知。

## 工具调用（tools）

| 服务商 | 支持情况 |
|--------|----------|
| OpenAI 分组 | ✅ 支持 `tools`、`tool_choice`、多轮 `tool_calls` |
| DeepSeek 分组 | ✅ OpenAI 兼容格式 |
| Anthropic 分组 | ✅ 随请求体透传 |
| **Google Gemini** | ❌ **不支持** `tools` / `tool_choice` |

Gemini 模型若携带 `tools` 或 `tool_choice`，接口会返回 **400**，错误码 `tools_not_supported`。请改用 GPT 或 DeepSeek 系列做 Agent。

### 预扣费说明

调用前会按 **messages + tools + tool_choice**（及 Anthropic 的 `system`）估算 prompt token 并冻结余额；若实际用量略高于预扣，结算时会补扣差额（需账户仍有足够余额）。

## 流式输出（stream）

OpenAI / DeepSeek 兼容接口支持 **`stream: true`**，响应为 SSE（`text/event-stream`）。

- 平台会自动附加 `stream_options.include_usage: true`，以便流结束后按真实 token 计费
- 若上游未返回 usage，将按预扣金额结算（不会白嫖）

Anthropic、Gemini 路径暂不支持流式透传。

## 请求体大小

单次 `POST /api/v1/chat/completions` 请求体上限约 **4 MB**（与 Vercel Serverless 限制对齐）。

超出时返回 **413**，错误码 `payload_too_large`，提示减少 tools 数量或缩短 messages。

常见原因：

- 一次传入几十个 function 定义
- 工具 `description` / JSON Schema 过长
- 多轮对话未做历史裁剪

建议：动态加载少量 tools、压缩 tool 返回、对历史做摘要。

## 常见错误

| HTTP | type / code | 含义 |
|------|-------------|------|
| 402 | `insufficient_quota` | 余额不足以完成预扣 |
| 413 | `payload_too_large` | 请求体过大 |
| 400 | `tools_not_supported` | Gemini 不支持 tools |
| 500 | `billing_error` | 结算异常（少见；可加余额后重试） |

## 数据库迁移（结算补扣）

若曾执行过旧版 `settle_balance`（不允许实付超过预扣），请在 Supabase SQL Editor 中重新执行 [`supabase-billing-reserve.sql`](../supabase-billing-reserve.sql) 中的 `settle_balance` 函数定义，或运行 `npm run db:setup`。
