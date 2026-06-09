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

## 方式 B：OpenAI 兼容中转（不走代理）

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
