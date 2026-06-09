-- 充值记录表：SQL Editor → Create a new snippet → Run（见 docs/supabase-sql-editor-only.md）
CREATE TABLE IF NOT EXISTS public.recharge_records (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  order_no TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 4) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('alipay', 'wechat', 'combined')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recharge_records_user_id ON public.recharge_records(user_id);
CREATE INDEX IF NOT EXISTS idx_recharge_records_created_at ON public.recharge_records(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recharge_records_order_no ON public.recharge_records(order_no);
CREATE INDEX IF NOT EXISTS idx_recharge_records_status_created ON public.recharge_records(status, created_at DESC);

ALTER TABLE public.recharge_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_see_own_recharge_records" ON public.recharge_records;
CREATE POLICY "users_can_see_own_recharge_records"
  ON public.recharge_records FOR SELECT
  USING (auth.uid() = user_id);
