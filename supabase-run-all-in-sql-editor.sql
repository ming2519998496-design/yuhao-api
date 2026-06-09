-- ============================================
-- 一次性执行（仅需 Supabase SQL Editor，无需 Connection string）
-- Supabase：SQL Editor → + → Create a new snippet → 粘贴本文件 → Run
-- ============================================

-- ########## 1/4 基础表 ##########
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '默认密钥',
  balance DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
  total_usage DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_category_ids TEXT[] NOT NULL DEFAULT ARRAY['openai', 'google', 'deepseek'],
  default_model_id TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

CREATE TABLE IF NOT EXISTS usage_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key_id ON usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_see_own_keys" ON api_keys;
CREATE POLICY "users_can_see_own_keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_insert_own_keys" ON api_keys;
DROP POLICY IF EXISTS "users_can_update_own_keys" ON api_keys;
DROP POLICY IF EXISTS "users_can_delete_own_keys" ON api_keys;

DROP POLICY IF EXISTS "users_can_see_own_usage" ON usage_logs;
CREATE POLICY "users_can_see_own_usage"
  ON usage_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_can_insert_usage" ON usage_logs;

-- ########## 2/4 管理后台表 ##########
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

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO platform_settings (key, value)
VALUES (
  'payment_accounts',
  '{"alipay":{"enabled":false,"accountName":"","accountNo":"","qrCodeMode":"url","qrCodeUrl":"","qrCodeUploadUrl":"","note":""},"wechat":{"enabled":false,"accountName":"","accountNo":"","qrCodeMode":"url","qrCodeUrl":"","qrCodeUploadUrl":"","note":""}}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ########## 3/4 扣费函数 ##########
CREATE OR REPLACE FUNCTION public.deduct_balance(p_key_id UUID, p_amount DECIMAL)
RETURNS void AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'deduct_balance: amount must be positive';
  END IF;

  UPDATE api_keys
  SET
    balance = GREATEST(0, ROUND((balance - p_amount)::numeric, 2)),
    total_usage = ROUND((total_usage + p_amount)::numeric, 2),
    last_used_at = NOW()
  WHERE id = p_key_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'deduct_balance: api key not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.deduct_balance(UUID, DECIMAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_balance(UUID, DECIMAL) FROM anon;
REVOKE ALL ON FUNCTION public.deduct_balance(UUID, DECIMAL) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_balance(UUID, DECIMAL) TO service_role;

-- ########## 4/4 安全加固 ##########
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

-- ########## 充值记录 ##########
CREATE TABLE IF NOT EXISTS public.recharge_records (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  order_no TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 4) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('alipay', 'wechat', 'combined')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recharge_records_user_id ON public.recharge_records(user_id);
CREATE INDEX IF NOT EXISTS idx_recharge_records_created_at ON public.recharge_records(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recharge_records_order_no ON public.recharge_records(order_no);
CREATE INDEX IF NOT EXISTS idx_recharge_records_status_created ON public.recharge_records(status, created_at DESC);

ALTER TABLE public.recharge_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_see_own_recharge_records" ON public.recharge_records;
CREATE POLICY "users_can_see_own_recharge_records"
  ON public.recharge_records FOR SELECT
  USING (auth.uid() = user_id);

-- ########## 邀请奖励 ##########
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS aff_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_aff_code ON public.profiles(aff_code)
  WHERE aff_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recharge_record_id BIGINT REFERENCES public.recharge_records(id) ON DELETE SET NULL,
  recharge_amount DECIMAL(12, 4) NOT NULL,
  reward_amount DECIMAL(12, 4) NOT NULL,
  reward_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.05,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'transferred')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON public.referral_earnings(referrer_id);

ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_see_own_referral_earnings" ON public.referral_earnings;
CREATE POLICY "users_see_own_referral_earnings"
  ON public.referral_earnings FOR SELECT
  USING (auth.uid() = referrer_id);

-- ########## 账户冻结 ##########
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_is_frozen ON public.profiles(is_frozen)
  WHERE is_frozen = TRUE;

-- ########## 令牌模型列（已建过 api_keys 的旧库可重复执行）##########
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS allowed_category_ids TEXT[] NOT NULL
    DEFAULT ARRAY['openai', 'google', 'deepseek'];
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS default_model_id TEXT NOT NULL
    DEFAULT 'gpt-4o-mini';

-- ########## 在线支付（XorPay 等）##########
-- 完整脚本见 supabase-recharge-online-payment.sql
ALTER TABLE public.recharge_records
  DROP CONSTRAINT IF EXISTS recharge_records_status_check;

ALTER TABLE public.recharge_records
  ADD CONSTRAINT recharge_records_status_check
  CHECK (status IN ('pending', 'completed', 'rejected', 'expired'));

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS pay_provider TEXT;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS merchant_profile TEXT;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS merchant_id TEXT;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS external_order_id TEXT;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS external_trade_id TEXT;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12, 4);

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS pay_redirect_url TEXT;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS notify_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS pay_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.recharge_records
  DROP CONSTRAINT IF EXISTS recharge_records_source_check;

ALTER TABLE public.recharge_records
  ADD CONSTRAINT recharge_records_source_check
  CHECK (source IN ('manual', 'online'));

ALTER TABLE public.recharge_records
  DROP CONSTRAINT IF EXISTS recharge_records_merchant_profile_check;

ALTER TABLE public.recharge_records
  ADD CONSTRAINT recharge_records_merchant_profile_check
  CHECK (
    merchant_profile IS NULL
    OR merchant_profile IN ('personal', 'sole_trader', 'enterprise')
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_recharge_records_external_order_id
  ON public.recharge_records(external_order_id)
  WHERE external_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recharge_records_online_pending
  ON public.recharge_records(user_id, status, source)
  WHERE source = 'online' AND status = 'pending';
