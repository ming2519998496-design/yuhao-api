-- 第 1 步验证：Create a new snippet → Run → 看 Results
-- 每行 status 应为 OK；FAIL 表示还需执行对应迁移文件

SELECT 'api_keys' AS item,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'api_keys'
  ) THEN 'OK' ELSE 'FAIL' END AS status,
  'supabase-run-all-in-sql-editor.sql' AS fix_hint

UNION ALL
SELECT 'api_keys.allowed_category_ids',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'api_keys'
      AND column_name = 'allowed_category_ids'
  ) THEN 'OK' ELSE 'FAIL' END,
  'supabase-api-key-models.sql'

UNION ALL
SELECT 'api_keys.default_model_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'api_keys'
      AND column_name = 'default_model_id'
  ) THEN 'OK' ELSE 'FAIL' END,
  'supabase-api-key-models.sql'

UNION ALL
SELECT 'recharge_records',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'recharge_records'
  ) THEN 'OK' ELSE 'FAIL' END,
  'supabase-recharge-records.sql'

UNION ALL
SELECT 'referral_earnings',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'referral_earnings'
  ) THEN 'OK' ELSE 'FAIL' END,
  'supabase-referral-schema.sql（需先有 recharge_records）'

UNION ALL
SELECT 'profiles.aff_code',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'aff_code'
  ) THEN 'OK' ELSE 'FAIL' END,
  'supabase-referral-schema.sql'

UNION ALL
SELECT 'platform_settings',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'platform_settings'
  ) THEN 'OK' ELSE 'FAIL' END,
  'supabase-admin-schema.sql'

ORDER BY item;
