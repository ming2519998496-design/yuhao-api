-- ============================================
-- 遇好API 数据库建表 SQL
-- 在 Supabase SQL Editor 中运行
-- ============================================

-- 1. API Keys 表
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,              -- 存储 Key 的哈希值，不存原文
  key_prefix TEXT NOT NULL,                    -- 显示用的前缀，如 "yh_abc..."
  name TEXT NOT NULL DEFAULT '默认密钥',       -- Key 名称
  balance DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,  -- 余额（元）
  total_usage DECIMAL(12, 4) NOT NULL DEFAULT 0.0000, -- 累计消费
  is_active BOOLEAN NOT NULL DEFAULT TRUE,     -- 是否启用
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- 索引：按用户查询 Key
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
-- 索引：按 Key 哈希查询（验证时用）
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- 2. 调用记录表
CREATE TABLE IF NOT EXISTS usage_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,                         -- 调用的模型名
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost DECIMAL(10, 6) NOT NULL DEFAULT 0,     -- 本次扣费金额
  success BOOLEAN NOT NULL DEFAULT TRUE,       -- 调用是否成功
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：按 Key 查调用记录
CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key_id ON usage_logs(api_key_id);
-- 索引：按用户查调用记录（控制台看板用）
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
-- 索引：按时间排序
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);

-- 3. 启用 Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- 用户只能看自己的 Key
CREATE POLICY "users_can_see_own_keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

-- 用户只能插入自己的 Key
CREATE POLICY "users_can_insert_own_keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的 Key
CREATE POLICY "users_can_update_own_keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = user_id);

-- 用户只能删除自己的 Key
CREATE POLICY "users_can_delete_own_keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- 用户只能看自己的调用记录
CREATE POLICY "users_can_see_own_usage"
  ON usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 系统可以插入调用记录（通过 service_role）
CREATE POLICY "service_can_insert_usage"
  ON usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');
