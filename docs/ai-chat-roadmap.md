# AI 对话 · 分阶段计划

> 当前策略：**先完善 `/chat` 功能 → 再做网站使用说明页 → 最后一次性跑齐配置并上线自测。**

---

## 阶段 A：完善 AI 对话（当前）

### 已完成

- [x] `/chat` 页面：登录后选 Key，对话 / 图像 / 视频三种模式
- [x] Web API：`/api/web/chat/completions`、`/api/web/generations`（Session 鉴权）
- [x] 流式对话（OpenAI / DeepSeek）
- [x] 图像 / 视频生成 + 预览 + 下载
- [x] 历史记录：自动保存、列表、加载、删除
- [x] 历史媒体仅存链接（视频用 Google URI；图像无外链时上传 `chat-media` 桶）

### 待完善（按优先级）

| # | 项 | 说明 |
|---|-----|------|
| 1 | 跑通 `supabase-chat-features.sql` | 历史记录才能落库 |
| 2 | 对话 / 图像 / 视频各测一轮 | 含扣费、历史回放、下载 |
| 3 | Veo 视频稳定性 | 上游 Key、代理、超时 |
| 4 | Gemini 对话非流式体验 | 可选：后续加流式 |
| 5 | 历史记录数量上限 / 清理策略 | 可选，防 Storage 膨胀 |

---

## 阶段 B：网站使用说明页

目标：站内 **`/docs/guide`**（或 `/help`），面向普通用户（非开发者 API 文档）。

### 建议目录

1. **快速开始**：注册 → 充值 → 创建 Key → 打开 AI 对话
2. **AI 对话**：选模式、选模型、历史记录、下载生成结果
3. **令牌与计费**：Key 分组、共享余额、价目说明链接
4. **充值与余额**：人工确认 / 在线支付（若已开通）
5. **常见问题**：余额不足、模型无权限、视频失败、历史不显示
6. **开发者**：链到现有 `/docs/quickstart`（API 接入）

### 导航入口

- 页脚、侧栏「使用说明」
- `/chat` 空状态区简短引导 + 链接

---

## 阶段 C：配置一次性跑齐

### 数据库（Supabase SQL Editor）

**新库或从未迁移过**：按 [launch-checklist.md](./launch-checklist.md) 第 1 步顺序 Run。

**已有基础库、只补 AI 对话**：只需 Run 一次：

```
supabase-chat-features.sql
```

**完整顺序参考**（已执行过的可跳过）：

| 顺序 | 文件 | 作用 |
|------|------|------|
| ① | `supabase-run-all-in-sql-editor.sql` | 基础表 + 安全 + 充值 + 邀请 |
| ② | `supabase-api-key-models.sql` | 令牌分组 + 默认模型（① 已含可跳过） |
| ③ | `supabase-billing-reserve.sql` | 预扣费结算（若未在 ① 中） |
| ④ | `supabase-storage-payment.sql` | 收款码上传（可选） |
| ⑤ | **`supabase-chat-features.sql`** | **AI 对话历史 + chat-media 桶** |

验证：

```bash
npm run check:db
```

### 环境变量（`.env.local` / Vercel）

- Supabase：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`
- 管理员：`ADMIN_EMAILS`
- 上游：`GOOGLE_API_KEY`、`OPENAI_API_KEY` 或 `AI_GATEWAY_API_KEY`、`DEEPSEEK_API_KEY`
- 本地代理：`HTTPS_PROXY`（见 [local-dev-upstream.md](./local-dev-upstream.md)）

### 自测清单（AI 对话专项）

- [ ] 登录 → `/chat` → 选 Key → 文字对话多轮 + 流式
- [ ] 图像模式生成 → 预览 → 下载 → 历史可打开
- [ ] 视频模式（Veo）→ 预览 → 下载 → 历史可打开
- [ ] 左侧历史列表有记录，删除单条正常
- [ ] 账户余额扣费与控制台一致

全部通过后 → 进入 [launch-checklist.md](./launch-checklist.md) 第 3 步上线。
