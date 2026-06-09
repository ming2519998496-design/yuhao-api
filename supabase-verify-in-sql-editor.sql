-- ============================================
-- 安全验证：Create a new snippet → Run，只看 Results 面板（见 docs/supabase-sql-editor-only.md）
-- 不要点 Explain；每项 expected 列写明了期望值
-- ============================================

SELECT '1_tables' AS check_id, table_name AS actual, 'one of 4 core tables' AS expected
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('api_keys', 'usage_logs', 'profiles', 'platform_settings')

UNION ALL

SELECT '2_policy_' || cmd, policyname, 'only SELECT allowed on api_keys'
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'api_keys'

UNION ALL

SELECT '3_deduct_balance_anon', anon::text, 'false'
FROM (SELECT has_function_privilege('anon', 'public.deduct_balance(uuid,numeric)', 'EXECUTE') AS anon) t

UNION ALL

SELECT '3_deduct_balance_authenticated', auth::text, 'false'
FROM (SELECT has_function_privilege('authenticated', 'public.deduct_balance(uuid,numeric)', 'EXECUTE') AS auth) t

UNION ALL

SELECT '3_deduct_balance_service_role', svc::text, 'true'
FROM (SELECT has_function_privilege('service_role', 'public.deduct_balance(uuid,numeric)', 'EXECUTE') AS svc) t

UNION ALL

SELECT '4_trigger', tgname, 'installed'
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgname IN ('api_keys_guard_sensitive_trigger', 'profiles_guard_role_trigger')

ORDER BY check_id, actual;
