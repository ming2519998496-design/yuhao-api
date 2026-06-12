-- 管理员余额调整记录（用于统计今日收入等平台指标）
-- Supabase SQL Editor → Create a new snippet → Run

CREATE TABLE IF NOT EXISTS public.balance_adjustment_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_balance DECIMAL(12, 4) NOT NULL,
  new_balance DECIMAL(12, 4) NOT NULL,
  delta DECIMAL(12, 4) NOT NULL,
  kind TEXT NOT NULL DEFAULT 'admin' CHECK (kind IN ('admin', 'recharge')),
  recharge_record_id BIGINT REFERENCES public.recharge_records(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 已有表时追加列（Supabase SQL Editor → Run）
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

CREATE INDEX IF NOT EXISTS idx_balance_adjustment_logs_created_at
  ON public.balance_adjustment_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_balance_adjustment_logs_user_id
  ON public.balance_adjustment_logs(user_id);

ALTER TABLE public.balance_adjustment_logs ENABLE ROW LEVEL SECURITY;
