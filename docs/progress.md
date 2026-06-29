# 遇好API — 项目进度表

> **用法**：每天开工看「今日进度表」；收工前更新状态（点击 `- [ ]` 可勾选）。  
> 相关文档：[launch-checklist.md](./launch-checklist.md) · [local-dev-upstream.md](./local-dev-upstream.md) · [ai-chat-roadmap.md](./ai-chat-roadmap.md)

**状态图例**：`☐` 未开始 · `🟡` 进行中 · `✅` 完成 · `🔴` 阻塞 / 跳过

---

## 今日进度表

<!-- 每天把本节日期改成当天；新的一天复制「每日记录模板」到文末历史区 -->

**日期：2026-06-27**

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 1 | `/chat` 页面（对话/图像/视频 + Key 选择） | ✅ | Session 鉴权 Web API |
| 2 | 历史记录自动保存（链接存媒体） | ✅ | 待 Run `supabase-chat-features.sql` |
| 3 | Veo 视频解析与媒体代理 | 🟡 | 已修响应格式，待实机复测 |
| 4 | AI 对话功能完善与自测 | 🟡 | 见 docs/ai-chat-roadmap.md |
| 5 | 网站使用说明页 `/dashboard/guide` | ✅ | 侧栏「数据看板」下方 |
| 6 | 配置一次性跑齐 + 上线清单 | ☐ | 阶段 C |

**今日小结**：AI 对话 MVP 已上线（/chat、历史、链接存图视频）；按三阶段推进：完善对话 → 使用说明页 → 批量配置。

**明日优先**
- [ ] Run `supabase-chat-features.sql`，`npm run check:db` 验证
- [ ] `/chat` 对话 + 图像 + 视频全流程自测
- [ ] 按 [ai-chat-roadmap.md](./ai-chat-roadmap.md) 收尾阶段 A
- [ ] 阶段 B：使用说明页内容按需补充
- [ ] 阶段 C：对照 launch-checklist 一次性跑配置

---

## 总进度一览

| 阶段 | 状态 | 说明 |
|------|------|------|
| 数据库与账户 | 🟢 | `npm run check:db` 已通过 |
| 本地 API 测试 | 🟢 | DeepSeek / Google / OpenAI curl 通过 |
| 管理后台功能 | 🟢 | 上游 Key、价格导入、共享余额 |
| 定价策略 | 🟢 | Scheme B：USD×7.2×分档加价，CSV 已生成 |
| AI 对话（/chat） | 🟡 | 功能已有，待 SQL + 自测 |
| 上线部署 | ⚪ | Vercel + 正式域名 |

---

## 功能清单（长期 · 勾选 = 已完成）

### 数据库（Supabase）

- [x] 基础表与安全迁移
- [x] 令牌分组 + 默认模型列
- [x] API 冻结/结算计费
- [x] 账户共享余额（`profiles.balance`）
- [x] `npm run check:db` 全部通过

### 平台功能

- [x] 用户注册 / 登录 / 控制台
- [x] 令牌管理 + 共享余额 + 消费金额展示
- [x] 充值 + 管理员确认
- [x] 邀请奖励
- [x] Gemini 2.0 下架
- [x] 上游 Key 即时生效 + 模型价格批量导入
- [x] `/chat` AI 对话（对话/图像/视频 + 历史记录）
- [ ] `/chat` 数据库迁移执行 + 全流程自测
- [x] 网站使用说明页（`/dashboard/guide`）
- [ ] 虎皮椒等在线支付

### 本地开发与测试

- [x] DeepSeek / Google / OpenAI 本地通过
- [x] `HTTPS_PROXY` + `npm run test:upstream`

### 定价与成本

- [x] 官方价对照表（Desktop）
- [ ] 确定加价比例
- [ ] 导入正式价目 CSV
- [ ] 核对三方毛利

### 上线（Vercel + Supabase）

- [ ] GitHub → Vercel 部署
- [ ] 环境变量 + 正式域名 + 邮件 Hook
- [ ] 生产全流程复测

---

## 历史每日记录

<details>
<summary>2026-05-19（点击展开）</summary>

| # | 任务 | 状态 |
|---|------|------|
| 1 | 共享余额 + 本地三厂商测试 | ✅ |
| 2 | 上游 Key / 价格导入功能 | ✅ |
| 3 | 成本估算 + 进度表建立 | ✅ |
| 4 | 价目定稿 | 🟡 |

**备注**：OpenAI 自有账户充值作上游。

</details>

---

## 每日记录模板（复制用）

新的一天：**① 把顶部「今日进度表」日期改成当天并清空上表 ② 在「历史每日记录」追加 `<details>` 归档昨天 ③ 更新「总进度一览」**

```markdown
**日期：YYYY-MM-DD**

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 1 | | ☐ | |
| 2 | | ☐ | |

**今日小结**：

**明日优先**
- [ ]
```
