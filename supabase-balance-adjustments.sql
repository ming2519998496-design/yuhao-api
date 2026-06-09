-- 管理员余额调整记录（用于统计今日收入等平台指标）
-- Supabase SQL Editor → Create a new snippet → Run

CREATE TABLE IF NOT EXISTS public.balance_adjustment_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_balance DECIMAL(12, 4) NOT NULL,
  new_balance DECIMAL(12, 4) NOT NULL,
  delta DECIMAL(12, 4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balance_adjustment_logs_created_at
  ON public.balance_adjustment_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_balance_adjustment_logs_user_id
  ON public.balance_adjustment_logs(user_id);

ALTER TABLE public.balance_adjustment_logs ENABLE ROW LEVEL SECURITY;
