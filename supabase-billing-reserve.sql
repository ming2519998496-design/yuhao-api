-- ============================================
-- 计费冻结/结算（在 supabase-security-fix.sql 之后执行）
-- 余额在 profiles.balance（账户共享）；api_keys 仅记录用量
-- 若尚未迁移，请先执行 supabase-user-wallet.sql
-- 流程：reserve_balance → 调用上游 → settle_balance 或 release_balance
-- ============================================

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
