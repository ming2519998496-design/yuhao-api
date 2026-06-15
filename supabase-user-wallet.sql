-- ============================================
-- 账户共享余额（在 supabase-billing-reserve.sql 之后执行）
-- 余额从 api_keys.balance 迁移到 profiles.balance，任意 Key 共用
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS balance DECIMAL(12, 4) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.balance IS '用户账户共享余额（元），所有 API Key 共用';

-- SQL Editor 不是 service_role JWT，迁移数据时需暂时关闭列保护触发器
ALTER TABLE public.api_keys DISABLE TRIGGER api_keys_guard_sensitive_trigger;
ALTER TABLE public.profiles DISABLE TRIGGER profiles_guard_role_trigger;

-- 将各 Key 上分散的余额合并到账户（可重复执行；取 profiles 与 Key 合计的较大值）
UPDATE public.profiles p
SET balance = ROUND(
  GREATEST(
    p.balance,
    COALESCE(
      (SELECT SUM(k.balance) FROM public.api_keys k WHERE k.user_id = p.id),
      0
    )
  )::numeric,
  2
)
WHERE EXISTS (
  SELECT 1 FROM public.api_keys k WHERE k.user_id = p.id AND k.balance > 0
);

UPDATE public.api_keys SET balance = 0 WHERE balance <> 0;

ALTER TABLE public.api_keys ENABLE TRIGGER api_keys_guard_sensitive_trigger;

-- 禁止客户端直接改 profiles.balance
CREATE OR REPLACE FUNCTION public.profiles_guard_role()
RETURNS TRIGGER AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'user';
    NEW.balance := 0;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'cannot change profile role';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.balance IS DISTINCT FROM OLD.balance THEN
    RAISE EXCEPTION 'profile balance is read-only';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_guard_role_trigger ON public.profiles;
CREATE TRIGGER profiles_guard_role_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_role();

-- 冻结：从账户余额扣（通过 Key 查 user_id）
CREATE OR REPLACE FUNCTION public.reserve_balance(p_key_id UUID, p_amount DECIMAL)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'reserve_balance: amount must be positive';
  END IF;

  SELECT user_id INTO v_user_id
  FROM public.api_keys
  WHERE id = p_key_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'reserve_balance: api key not found';
  END IF;

  UPDATE public.profiles
  SET balance = ROUND((balance - p_amount)::numeric, 2)
  WHERE id = v_user_id AND balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reserve_balance: insufficient balance';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.settle_balance(
  p_key_id UUID,
  p_reserved DECIMAL,
  p_actual DECIMAL
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_refund DECIMAL;
  v_extra DECIMAL;
BEGIN
  IF p_reserved IS NULL OR p_reserved <= 0 THEN
    RAISE EXCEPTION 'settle_balance: reserved must be positive';
  END IF;
  IF p_actual IS NULL OR p_actual < 0 THEN
    RAISE EXCEPTION 'settle_balance: actual must be non-negative';
  END IF;

  SELECT user_id INTO v_user_id
  FROM public.api_keys
  WHERE id = p_key_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'settle_balance: api key not found';
  END IF;

  IF p_actual > p_reserved THEN
    v_extra := ROUND((p_actual - p_reserved)::numeric, 2);
    UPDATE public.profiles
    SET balance = ROUND((balance - v_extra)::numeric, 2)
    WHERE id = v_user_id AND balance >= v_extra;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'settle_balance: insufficient balance for overage';
    END IF;
  ELSE
    v_refund := ROUND((p_reserved - p_actual)::numeric, 2);
    UPDATE public.profiles
    SET balance = ROUND((balance + v_refund)::numeric, 2)
    WHERE id = v_user_id;
  END IF;

  UPDATE public.api_keys
  SET
    total_usage = ROUND((total_usage + p_actual)::numeric, 2),
    last_used_at = NOW()
  WHERE id = p_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.release_balance(p_key_id UUID, p_amount DECIMAL)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'release_balance: amount must be positive';
  END IF;

  SELECT user_id INTO v_user_id
  FROM public.api_keys
  WHERE id = p_key_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'release_balance: api key not found';
  END IF;

  UPDATE public.profiles
  SET balance = ROUND((balance + p_amount)::numeric, 2)
  WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 旧版 deduct_balance 同步改为扣账户余额
CREATE OR REPLACE FUNCTION public.deduct_balance(p_key_id UUID, p_amount DECIMAL)
RETURNS void AS $$
BEGIN
  PERFORM public.reserve_balance(p_key_id, p_amount);
  PERFORM public.settle_balance(p_key_id, p_amount, p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.reserve_balance(UUID, DECIMAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_balance(UUID, DECIMAL) FROM anon;
REVOKE ALL ON FUNCTION public.reserve_balance(UUID, DECIMAL) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_balance(UUID, DECIMAL) TO service_role;

REVOKE ALL ON FUNCTION public.settle_balance(UUID, DECIMAL, DECIMAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_balance(UUID, DECIMAL, DECIMAL) FROM anon;
REVOKE ALL ON FUNCTION public.settle_balance(UUID, DECIMAL, DECIMAL) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.settle_balance(UUID, DECIMAL, DECIMAL) TO service_role;

REVOKE ALL ON FUNCTION public.release_balance(UUID, DECIMAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_balance(UUID, DECIMAL) FROM anon;
REVOKE ALL ON FUNCTION public.release_balance(UUID, DECIMAL) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.release_balance(UUID, DECIMAL) TO service_role;

REVOKE ALL ON FUNCTION public.deduct_balance(UUID, DECIMAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_balance(UUID, DECIMAL) FROM anon;
REVOKE ALL ON FUNCTION public.deduct_balance(UUID, DECIMAL) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_balance(UUID, DECIMAL) TO service_role;
