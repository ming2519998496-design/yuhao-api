-- ============================================
-- 安全加固（在 supabase-schema.sql / supabase-admin-schema.sql 之后执行）
-- 修复：api_keys 余额篡改、deduct_balance 滥用、profiles 提权
-- ============================================

-- ---------- 1. api_keys：禁止客户端直接增改敏感字段 ----------
DROP POLICY IF EXISTS "users_can_insert_own_keys" ON api_keys;
DROP POLICY IF EXISTS "users_can_update_own_keys" ON api_keys;
DROP POLICY IF EXISTS "users_can_delete_own_keys" ON api_keys;

-- 仅允许查看自己的 Key；创建/改余额/删除 仅服务端 service_role（绕过 RLS）
-- SELECT 策略 "users_can_see_own_keys" 保留

-- 兜底触发器：非 service_role 不得改 balance / key_hash / total_usage
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

-- ---------- 2. usage_logs：仅服务端写入 ----------
DROP POLICY IF EXISTS "service_can_insert_usage" ON usage_logs;
-- 无 INSERT 策略 → authenticated/anon 无法插入；service_role 绕过 RLS

-- ---------- 3. profiles：禁止用户自行改 role ----------
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

-- ---------- 4. deduct_balance：校验金额 + 仅 service_role 可执行 ----------
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
