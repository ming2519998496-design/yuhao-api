-- 充值相关数据库补丁（已有 recharge_records 表时一次性执行）
-- Supabase SQL Editor → Create a new snippet → Run

-- 1. 允许二码合一 combined
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

-- 2. 订单号 + 确认时间
ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS order_no TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE public.recharge_records
SET order_no = 'RC' || LPAD(id::text, 12, '0')
WHERE order_no IS NULL;

ALTER TABLE public.recharge_records
  ALTER COLUMN order_no SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recharge_records_order_no
  ON public.recharge_records(order_no);

CREATE INDEX IF NOT EXISTS idx_recharge_records_status_created
  ON public.recharge_records(status, created_at DESC);

-- 3. 转账凭证
ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- 4. 允许用户提交时金额为 0（待管理员核对凭证后填写）
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
