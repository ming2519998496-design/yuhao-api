-- 充值转账凭证 URL
ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS proof_url TEXT;
