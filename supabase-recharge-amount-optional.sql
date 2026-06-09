-- 允许充值记录金额为 0（用户仅上传凭证，金额由管理员核对后填写）
-- Supabase SQL Editor → Run

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
      AND pg_get_constraintdef(con.oid) ILIKE '%amount%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.recharge_records DROP CONSTRAINT IF EXISTS %I',
      cname
    );
  END LOOP;
END $$;

ALTER TABLE public.recharge_records
  ADD CONSTRAINT recharge_records_amount_check
  CHECK (amount >= 0);
