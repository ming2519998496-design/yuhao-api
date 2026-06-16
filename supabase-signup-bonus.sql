-- 新用户注册体验金（在 supabase-user-wallet.sql 之后执行）
-- Supabase SQL Editor → Create a new snippet → Run

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_bonus_granted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.signup_bonus_granted_at IS '注册体验金发放时间（幂等标记）';

-- 已有用户不再补发体验金
UPDATE public.profiles
SET signup_bonus_granted_at = COALESCE(signup_bonus_granted_at, created_at)
WHERE signup_bonus_granted_at IS NULL;

-- 余额日志 kind 增加 signup
ALTER TABLE public.balance_adjustment_logs
  DROP CONSTRAINT IF EXISTS balance_adjustment_logs_kind_check;

ALTER TABLE public.balance_adjustment_logs
  ADD CONSTRAINT balance_adjustment_logs_kind_check
  CHECK (kind IN ('admin', 'recharge', 'signup'));
