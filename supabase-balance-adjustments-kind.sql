-- 余额变动日志：区分管理员调整 / 充值到账
-- Supabase SQL Editor → Create a new snippet → Run

ALTER TABLE public.balance_adjustment_logs
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'admin';

ALTER TABLE public.balance_adjustment_logs
  ADD COLUMN IF NOT EXISTS recharge_record_id BIGINT
    REFERENCES public.recharge_records(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'balance_adjustment_logs_kind_check'
  ) THEN
    ALTER TABLE public.balance_adjustment_logs
      ADD CONSTRAINT balance_adjustment_logs_kind_check
      CHECK (kind IN ('admin', 'recharge'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_balance_adjustment_logs_kind_created
  ON public.balance_adjustment_logs(kind, created_at DESC);
