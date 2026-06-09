-- API Key 绑定模型分组与默认模型
-- Supabase：SQL Editor → + → Create a new snippet → 粘贴本文件 → Run
-- 说明见 docs/supabase-sql-editor-only.md
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS allowed_category_ids TEXT[] NOT NULL
    DEFAULT ARRAY['openai', 'google', 'deepseek'];

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS default_model_id TEXT NOT NULL
    DEFAULT 'gpt-4o-mini';

COMMENT ON COLUMN api_keys.allowed_category_ids IS '允许调用的模型分组（category id）';
COMMENT ON COLUMN api_keys.default_model_id IS '请求未传 model 时使用的默认模型 id';
