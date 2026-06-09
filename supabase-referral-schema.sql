-- 邀请奖励：SQL Editor → Create a new snippet → Run（见 docs/supabase-sql-editor-only.md）

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS aff_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_aff_code ON public.profiles(aff_code)
  WHERE aff_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recharge_record_id BIGINT REFERENCES public.recharge_records(id) ON DELETE SET NULL,
  recharge_amount DECIMAL(12, 4) NOT NULL,
  reward_amount DECIMAL(12, 4) NOT NULL,
  reward_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.05,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'transferred')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON public.referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_status ON public.referral_earnings(referrer_id, status);

ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_see_own_referral_earnings" ON public.referral_earnings;
CREATE POLICY "users_see_own_referral_earnings"
  ON public.referral_earnings FOR SELECT
  USING (auth.uid() = referrer_id);
