# Supabase：用 SQL Editor 执行迁移（无需 Connection string）

新版界面里 **Database → Settings** 往往只有密码和连接池，**没有**连接串。  
**不必再找 Connect**，按下面步骤在 **SQL Editor** 里执行项目中的 `.sql` 文件即可。

## 界面用语（统一按改版后名称）

| 你要做的事 | 在 Supabase 里点 / 看 |
|------------|------------------------|
| 写并执行 SQL | 左侧 **SQL Editor** |
| 新建一段 SQL | 搜索框右侧 **`+`** → **Create a new snippet** |
| 执行当前 SQL | 编辑区右下角绿色 **Run**（或 Mac **⌘+Enter** / Win **Ctrl+Enter**） |
| 看执行结果 | 下方 **Results** 面板 |
| 整理多个 SQL 文件 | **`+`** → **Create a new folder**（仅分类，不执行） |
| 查看表和数据 | 左侧 **Table Editor** → 选表（如 `api_keys`） |

> 旧文档里的「New query / 新建查询」= 现在的 **Create a new snippet**，是同一入口。

## 第一步：打开 SQL Editor

左侧主菜单（不是 Database 子菜单里）→ **SQL Editor**。

## 第二步：执行 SQL（以一键建表为例）

1. **SQL Editor** 里点 **`+`** → **Create a new snippet**
2. 打开项目里的 **`supabase-run-all-in-sql-editor.sql`**，全选复制
3. 粘贴到右侧 snippet 编辑区
4. 点 **Run**
5. **Results** 里出现 `Success. No rows returned` 或类似成功提示即完成  

`already exists` 一般可忽略（说明对象已建过）。

## 第三步：验证安全加固

1. 再 **`+`** → **Create a new snippet**
2. 粘贴 **`supabase-verify-in-sql-editor.sql`** 全文 → **Run**
3. 在 **Results** 各标签页核对：

| 结果标签 | 期望 |
|----------|------|
| check_tables | 4 行：api_keys, profiles, platform_settings, usage_logs |
| api_keys_policies | 只有 **SELECT**，没有 INSERT/UPDATE/DELETE |
| anon_can_exec / auth_can_exec | **false** |
| service_can_exec | **true** |
| security_triggers | 两行触发器名称 |

## 令牌管理：加模型相关列（`api_keys`）

若 **Table Editor → api_keys** 里还没有 `allowed_category_ids`、`default_model_id`：

1. **SQL Editor** → **`+`** → **Create a new snippet**
2. 粘贴 **`supabase-api-key-models.sql`** 全文 → **Run**
3. 回到 **Table Editor → api_keys**，刷新表头，应多出上述两列（表可以为空）

## 其他单次迁移文件

均在 **SQL Editor** 里 **Create a new snippet** → 粘贴对应文件 → **Run**：

| 文件 | 用途 |
|------|------|
| `supabase-referral-schema.sql` | 邀请奖励 |
| `supabase-recharge-records.sql` | 充值记录 |
| `supabase-admin-schema.sql` | 管理后台、收款配置表 |
| `supabase-storage-payment.sql` | 收款码 Storage 桶 |
| `supabase-security-fix.sql` | 安全加固（可重复执行） |
| `supabase-billing-reserve.sql` | API 冻结/结算计费（可重复执行） |
| `supabase-max-admins.sql` | 最多 2 个管理员 |

## 方案 A（`npm run db:setup`）

仅当你能配置 `DATABASE_URL` 时才需要；**找不到连接串时，用 SQL Editor 方式即可，效果相同。**
