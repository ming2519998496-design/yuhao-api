-- 账户冻结（Supabase SQL Editor 执行一次）

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_is_frozen ON public.profiles(is_frozen)
  WHERE is_frozen = TRUE;
