# 遇好API 上线前清单（按顺序执行）

**本地 OpenAI / Google** → 见 [local-dev-upstream.md](./local-dev-upstream.md)（配置 `HTTPS_PROXY` 后 `npm run test:upstream`）

**每日进度表** → 见 [progress.md](./progress.md)（勾选完成项 + 按日记录）

---

## 第 1 步：数据库迁移（Supabase）

### 1.1 打开 SQL Editor

左侧 **SQL Editor** → **`+`** → **Create a new snippet**。

### 1.2 按顺序 Run（已执行过的文件可跳过，`IF NOT EXISTS` 可重复 Run）

| 顺序 | 文件 | 作用 |
|------|------|------|
| ① | `supabase-run-all-in-sql-editor.sql` | 基础表 + 安全 + 充值 + 邀请（新库推荐一次性） |
| ② | `supabase-api-key-models.sql` | 令牌「分组 + 默认模型」列（旧库若 ① 已含可跳过） |
| ③ | `supabase-admin-schema.sql` | 管理后台收款配置表（若 ① 已含可跳过） |
| ④ | `supabase-storage-payment.sql` | 收款码图片 Storage 桶（要用上传收款码时执行） |
| ⑤ | `supabase-max-admins.sql` | 最多 2 个管理员（可选） |

> 若你只有空表 `api_keys`、没有 `recharge_records`，必须先有 ① 或单独 Run `supabase-recharge-records.sql`，再 Run 邀请相关 SQL。

### 1.3 验证

**方式 A（Supabase）**  
Create a new snippet → 粘贴 **`supabase-step1-verify.sql`** → **Run** → 全部 `status = OK`。

**方式 B（本地终端）**

```bash
cd /Users/lming/ai-api-platform
npm run check:db
```

全部 ✓ 后进入第 2 步。

---

## 第 2 步：本地全流程自测

```bash
npm run dev
```

浏览器打开终端里的地址（通常 `http://localhost:3000`）。

### 2.1 账户与首页

- [ ] 注册（邮箱）→ 收验证码 → 登录成功  
- [ ] 打开首页 `/`：右上方显示 **邮箱 + 退出**（不是登录/注册）  
- [ ] 点邮箱进入 `/dashboard`；点退出恢复登录/注册  

### 2.2 令牌与 API

- [ ] `/console` **令牌管理**：无黄色「未迁移」提示（有则回到第 1 步）  
- [ ] **添加令牌** → 复制完整 `yh_...` Key  
- [ ] `/playground`：粘贴 Key → 选模型 → 发送 → 返回正常 JSON（非 401）  
- [ ] Table Editor → `api_keys` 有 1 行记录  

### 2.3 充值（需管理员）

- [ ] `.env.local` 中 `ADMIN_EMAILS` 包含你的邮箱  
- [ ] `/admin` → **收款账户**：启用并填写支付宝/微信信息  
- [ ] 普通用户 `/recharge` 提交一笔充值  
- [ ] 管理员 **充值确认** → 用户余额增加  

### 2.4 邀请（可选）

- [ ] `/dashboard/referral` 无「数据库未初始化」黄条  
- [ ] 注册链接带 `?aff=邀请码` 可绑定（若已测过可跳过）  

### 2.5 其它

- [ ] `/dashboard/settings`：仅邮箱改密/换绑，无手机相关项  
- [ ] 数据看板有统计（有调用后更明显）  

第 2 步全部打勾 → 进入第 3 步。

---

## 第 3 步：上线准备

- [ ] Resend 域名验证，生产邮件可达用户邮箱  
- [ ] 部署（如 Vercel），配置与 `.env.local` 相同的环境变量  
- [ ] 站点与示例代码中的 API 地址改为正式域名 `/v1`  
- [ ] 上游 Key：`OPENAI_API_KEY`、`GOOGLE_API_KEY`、`DEEPSEEK_API_KEY` 等已在托管环境配置  

---

## 当前进度（你可自行勾选）

- [ ] 第 1 步 完成  
- [ ] 第 2 步 完成  
- [ ] 第 3 步 完成  

完成第 1 步后告诉助手「第 1 步好了」，可一起过第 2 步里失败的项目。
