-- 为已有 profiles 表增加手机号字段（可选执行）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
