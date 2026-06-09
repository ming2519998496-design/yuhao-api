-- 在线支付扩展（XorPay 起步，后续可换个体户/企业商户配置）
-- Supabase SQL Editor → Run 一次

-- 1) 状态：增加 expired（在线订单超时未付）
ALTER TABLE public.recharge_records
  DROP CONSTRAINT IF EXISTS recharge_records_status_check;

ALTER TABLE public.recharge_records
  ADD CONSTRAINT recharge_records_status_check
  CHECK (status IN ('pending', 'completed', 'rejected', 'expired'));

-- 2) 支付渠道与进件主体（换个体户/企业时主要改配置，历史订单仍保留快照）
ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS pay_provider TEXT;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS merchant_profile TEXT;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS merchant_id TEXT;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS external_order_id TEXT;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS external_trade_id TEXT;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12, 4);

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS pay_redirect_url TEXT;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS notify_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.recharge_records
  ADD COLUMN IF NOT EXISTS pay_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

-- source: manual=上传凭证人工确认, online=第三方支付回调
ALTER TABLE public.recharge_records
  DROP CONSTRAINT IF EXISTS recharge_records_source_check;

ALTER TABLE public.recharge_records
  ADD CONSTRAINT recharge_records_source_check
  CHECK (source IN ('manual', 'online'));

ALTER TABLE public.recharge_records
  DROP CONSTRAINT IF EXISTS recharge_records_merchant_profile_check;

ALTER TABLE public.recharge_records
  ADD CONSTRAINT recharge_records_merchant_profile_check
  CHECK (
    merchant_profile IS NULL
    OR merchant_profile IN ('personal', 'sole_trader', 'enterprise')
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_recharge_records_external_order_id
  ON public.recharge_records(external_order_id)
  WHERE external_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recharge_records_online_pending
  ON public.recharge_records(user_id, status, source)
  WHERE source = 'online' AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_recharge_records_pay_provider
  ON public.recharge_records(pay_provider, merchant_profile);

COMMENT ON COLUMN public.recharge_records.source IS 'manual | online';
COMMENT ON COLUMN public.recharge_records.pay_provider IS 'xorpay | pingpp | ...';
COMMENT ON COLUMN public.recharge_records.merchant_profile IS '进件主体快照: personal | sole_trader | enterprise';
COMMENT ON COLUMN public.recharge_records.merchant_id IS '支付平台商户/App ID 快照，换主体后新单用新 ID';
COMMENT ON COLUMN public.recharge_records.external_order_id IS '支付平台订单号，如 XorPay aoid';
COMMENT ON COLUMN public.recharge_records.external_trade_id IS '微信/支付宝流水号';
