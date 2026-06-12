# 本地开发：跑通 OpenAI / Google 模型

DeepSeek 在国内可直接访问；OpenAI、Google 通常需要 **代理** 或 **中转 API**。

平台服务端会请求上游，因此要让 **`npm run dev` 进程** 能连上外网，而不是只开浏览器魔法。

---

## 方式 A：HTTP 代理（推荐，已有 Clash / Surge 等）

### 1. 查代理端口

在 Clash 等软件中查看 **HTTP 代理端口**（常见 `7890`）。

### 2. 写入 `.env.local`

```env
HTTPS_PROXY=http://127.0.0.1:7890
HTTP_PROXY=http://127.0.0.1:7890
```

端口改成你软件里显示的数值。

### 3. 检测网络

```bash
npm run test:upstream
```

期望输出类似：

```text
✓ OpenAI  HTTP 401  (xxx ms)
✓ Google Gemini  HTTP 404  (xxx ms)
✓ DeepSeek  HTTP 401  (xxx ms)
```

401 / 404 表示 **已连通**（未带 Key 时的正常响应）。

### 4. 配置上游 Key

管理后台 → **上游密钥**（或 `.env.local`）：

```env
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AI...
```

### 5. 重启 dev 并测试

```bash
# 必须在配置了 .env.local 的目录启动（Next 会自动读 env）
npm run dev
```

Playground 或 curl 测试 `gpt-4o-mini`、Gemini 对话模型。

> **注意**：修改 `.env.local` 后必须 **重启** `npm run dev`。

---

## 方式 C：Vercel AI Gateway（生产推荐，替代个人 OpenAI Key）

OpenAI 对话模型在 **Vercel 部署** 时默认经 [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) 转发，无需个人 `sk-...` OpenAI 账号。

### 1. 在 Vercel 开通 AI Gateway

Dashboard → 项目 **yuhao-api** → **AI Gateway** → 创建 API Key / 充值 Credits（每月含 $5 免费额度）。

### 2. 环境变量

```env
AI_GATEWAY_API_KEY=你的GatewayKey
```

或在管理后台 **上游 API Key → OpenAI** 填入同一 Gateway Key（DB 优先于 env）。

可选：

```env
OPENAI_USE_VERCEL_GATEWAY=true   # 本地 vercel dev 也走 Gateway
OPENAI_USE_VERCEL_GATEWAY=false  # 强制禁用 Gateway，改回直连 OpenAI
OPENAI_BASE_URL=https://ai-gateway.vercel.sh/v1  # 显式指定（与自动逻辑等效）
```

### 3. 行为说明

| 环境 | OpenAI 上游 |
|------|-------------|
| Vercel 生产（`VERCEL=1`） | 自动 `https://ai-gateway.vercel.sh/v1`，model 为 `openai/gpt-4o-mini` 等 |
| 本地 `npm run dev` | 仍默认 `api.openai.com`（除非设 `AI_GATEWAY_API_KEY` 或 `OPENAI_USE_VERCEL_GATEWAY=true`） |
| DeepSeek / Google | 不受影响，仍直连 |

### 4. 验证

Playground 选择 `gpt-4o-mini` 测试。若报上游错误，检查 Gateway Key 与 Credits 余额。

Token 价格与 OpenAI 官方一致（Gateway 不加价）；充值可能有支付通道费。

---

若使用国内 OpenAI 中转，在 `.env.local` 设置：

```env
OPENAI_BASE_URL=https://你的中转地址/v1
OPENAI_API_KEY=中转站提供的密钥
```

Google 若也有中转，可设：

```env
GOOGLE_BASE_URL=https://你的-gemini-中转/v1beta
```

---

## 常见问题

| 现象 | 处理 |
|------|------|
| 浏览器能上 Google，Playground 仍 fetch failed | 终端/Node 未走代理 → 配 `HTTPS_PROXY` 并重启 dev |
| `npm run test:upstream` 仍超时 | 端口错误；或换可访问 OpenAI 的节点 |
| OpenAI 401 | 网络已通，检查上游 Key |
| Google 403 / API key not valid | 检查 Google AI Studio Key 是否启用 Generative Language API |

---

## 与上线的关系

本地需要代理；部署到 **Vercel 等海外服务器** 后，服务器直连 OpenAI/Google，**用户无需魔法**。见上线清单 `docs/launch-checklist.md` 第 3 步。
