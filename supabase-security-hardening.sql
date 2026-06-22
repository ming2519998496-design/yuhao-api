-- 安全加固补丁（在 supabase-user-wallet.sql、supabase-billing-reserve.sql 之后执行）
-- Supabase SQL Editor → Run

-- 1. 余额不得为负（防御纵深）
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_balance_non_negative;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_balance_non_negative CHECK (balance >= 0);

-- 2. 原子入账（避免并发充值 lost update）
CREATE OR REPLACE FUNCTION public.credit_balance(p_user_id UUID, p_amount DECIMAL)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new DECIMAL;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'credit_balance: amount must be positive';
  END IF;

  UPDATE public.profiles
  SET balance = ROUND((balance + p_amount)::numeric, 2)
  WHERE id = p_user_id
  RETURNING balance INTO v_new;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'credit_balance: user not found';
  END IF;

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_balance(UUID, DECIMAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_balance(UUID, DECIMAL) TO service_role;

-- 3. 邀请奖励：同一充值记录不重复发放
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_earnings_unique_record
  ON public.referral_earnings(recharge_record_id, referrer_id)
  WHERE recharge_record_id IS NOT NULL;

-- 4. 客户端不可直接 SELECT key_hash（通过视图暴露安全列）
CREATE OR REPLACE VIEW public.api_keys_safe AS
SELECT
  id,
  user_id,
  key_prefix,
  name,
  balance,
  total_usage,
  is_active,
  allowed_category_ids,
  default_model_id,
  created_at,
  last_used_at
FROM public.api_keys;

COMMENT ON VIEW public.api_keys_safe IS '不含 key_hash 的 API Key 视图，供 authenticated 只读';
