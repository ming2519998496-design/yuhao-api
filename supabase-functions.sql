-- 计算余额调整为两位小数（元）
-- 调用方式: SELECT deduct_balance('key_uuid', 0.01);
CREATE OR REPLACE FUNCTION deduct_balance(p_key_id UUID, p_amount DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE api_keys
  SET
    balance = GREATEST(0, ROUND((balance - p_amount)::numeric, 2)),
    total_usage = ROUND((total_usage + p_amount)::numeric, 2),
    last_used_at = NOW()
  WHERE id = p_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
