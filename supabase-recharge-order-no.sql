-- 充值订单号 + 确认时间
-- Supabase SQL Editor → Run（需已有 recharge_records 表）

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
