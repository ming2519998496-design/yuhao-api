-- 修复充值记录：允许「二码合一」支付方式 combined
-- 已有库请在 Supabase SQL Editor → Run 本文件

DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'recharge_records'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%method%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.recharge_records DROP CONSTRAINT IF EXISTS %I',
      cname
    );
  END LOOP;
END $$;

ALTER TABLE public.recharge_records
  ADD CONSTRAINT recharge_records_method_check
  CHECK (method IN ('alipay', 'wechat', 'combined'));
