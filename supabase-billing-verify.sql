-- ============================================
-- 计费函数验证：Create a new snippet → Run
-- 期望：3 个函数存在；anon/auth 无 EXECUTE；service_role 有 EXECUTE
-- ============================================

SELECT 'fn_' || p.proname AS check_id,
       pg_get_function_identity_arguments(p.oid) AS signature,
       'exists' AS expected
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('reserve_balance', 'settle_balance', 'release_balance')

UNION ALL

SELECT 'perm_reserve_anon',
       has_function_privilege('anon', 'public.reserve_balance(uuid,numeric)', 'EXECUTE')::text,
       'false'

UNION ALL

SELECT 'perm_reserve_auth',
       has_function_privilege('authenticated', 'public.reserve_balance(uuid,numeric)', 'EXECUTE')::text,
       'false'

UNION ALL

SELECT 'perm_reserve_service',
       has_function_privilege('service_role', 'public.reserve_balance(uuid,numeric)', 'EXECUTE')::text,
       'true'

UNION ALL

SELECT 'perm_settle_service',
       has_function_privilege('service_role', 'public.settle_balance(uuid,numeric,numeric)', 'EXECUTE')::text,
       'true'

UNION ALL

SELECT 'perm_release_service',
       has_function_privilege('service_role', 'public.release_balance(uuid,numeric)', 'EXECUTE')::text,
       'true'

ORDER BY check_id;
