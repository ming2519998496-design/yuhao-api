-- 扣减 API Key 余额（仅服务端 service_role 可调用）
-- 调用方式: SELECT deduct_balance('key_uuid', 0.01);
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
