-- ============================================
-- 管理后台扩展表（在 supabase-schema.sql 之后运行）
-- ============================================

-- 用户资料与角色
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 平台配置（收款账户等）
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 默认收款配置
INSERT INTO platform_settings (key, value)
VALUES (
  'payment_accounts',
  '{
    "alipay": {
      "enabled": false,
      "accountName": "",
      "accountNo": "",
      "qrCodeMode": "url",
      "qrCodeUrl": "",
      "qrCodeUploadUrl": "",
      "note": ""
    },
    "wechat": {
      "enabled": false,
      "accountName": "",
      "accountNo": "",
      "qrCodeMode": "url",
      "qrCodeUrl": "",
      "qrCodeUploadUrl": "",
      "note": ""
    }
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- 用户可读自己的 profile
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 用户可更新自己的 profile（不含 role）
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 新用户注册时插入 profile（通过 trigger）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 禁止用户通过客户端修改 role（仅 service_role 可提升管理员）
CREATE OR REPLACE FUNCTION public.profiles_guard_role()
RETURNS TRIGGER AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'user';
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'cannot change profile role';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_guard_role_trigger ON profiles;
CREATE TRIGGER profiles_guard_role_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_role();

-- api_keys 敏感列保护（与 supabase-security-fix.sql 一致）
CREATE OR REPLACE FUNCTION public.api_keys_guard_sensitive()
RETURNS TRIGGER AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'api_keys insert not allowed for clients';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.balance IS DISTINCT FROM OLD.balance
       OR NEW.key_hash IS DISTINCT FROM OLD.key_hash
       OR NEW.key_prefix IS DISTINCT FROM OLD.key_prefix
       OR NEW.total_usage IS DISTINCT FROM OLD.total_usage
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'api_keys sensitive columns are read-only';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS api_keys_guard_sensitive_trigger ON api_keys;
CREATE TRIGGER api_keys_guard_sensitive_trigger
  BEFORE INSERT OR UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION public.api_keys_guard_sensitive();
