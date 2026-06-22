-- API 限流 + 注册体验金 IP 风控（Supabase SQL Editor 执行）
-- 依赖 service_role 调用 consume_rate_limit

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_updated
  ON public.rate_limit_buckets(updated_at);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_ip TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_signup_ip_bonus
  ON public.profiles(signup_ip, signup_bonus_granted_at)
  WHERE signup_ip IS NOT NULL;

COMMENT ON COLUMN public.profiles.signup_ip IS '注册时客户端 IP，用于体验金风控';

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_bucket TEXT,
  p_max INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE(allowed BOOLEAN, retry_after_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
  v_window INTERVAL;
BEGIN
  IF p_max IS NULL OR p_max <= 0 OR p_window_seconds IS NULL OR p_window_seconds <= 0 THEN
    allowed := TRUE;
    retry_after_seconds := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  v_window := make_interval(secs => p_window_seconds);

  SELECT b.window_start, b.request_count
  INTO v_window_start, v_count
  FROM public.rate_limit_buckets b
  WHERE b.bucket_key = p_bucket
  FOR UPDATE;

  IF NOT FOUND OR v_now >= v_window_start + v_window THEN
    INSERT INTO public.rate_limit_buckets (bucket_key, window_start, request_count, updated_at)
    VALUES (p_bucket, v_now, 1, v_now)
    ON CONFLICT (bucket_key) DO UPDATE SET
      window_start = EXCLUDED.window_start,
      request_count = 1,
      updated_at = EXCLUDED.updated_at;
    allowed := TRUE;
    retry_after_seconds := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_count >= p_max THEN
    allowed := FALSE;
    retry_after_seconds := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (v_window_start + v_window - v_now)))::INTEGER
    );
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.rate_limit_buckets
  SET request_count = v_count + 1, updated_at = v_now
  WHERE bucket_key = p_bucket;

  allowed := TRUE;
  retry_after_seconds := 0;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
