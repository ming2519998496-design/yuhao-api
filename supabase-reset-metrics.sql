-- ============================================
-- 清零业务数据（余额、调用记录、今日统计等）
-- SQL Editor → Create a new snippet → Run；保留用户账号与 API Key 记录
-- ============================================

-- 1. 清空所有 API 调用记录（今日调用、趋势、总消费均归零）
DELETE FROM public.usage_logs;

-- 2. 所有 API Key 余额与累计消费归零
UPDATE public.api_keys
SET
  balance = 0,
  total_usage = 0,
  last_used_at = NULL;

-- 可选：查看结果
SELECT
  (SELECT COUNT(*) FROM public.usage_logs) AS usage_logs_count,
  (SELECT COALESCE(SUM(balance), 0) FROM public.api_keys) AS total_balance,
  (SELECT COALESCE(SUM(total_usage), 0) FROM public.api_keys) AS total_usage_sum;
