-- ============================================
-- 【危险】删除所有注册用户与业务数据（完全重来）
-- 仅在测试环境使用！执行前请确认。
-- ============================================

DELETE FROM public.usage_logs;
DELETE FROM public.api_keys;
DELETE FROM public.profiles;
DELETE FROM public.platform_settings WHERE key = 'payment_accounts';

-- auth.users 需在 Supabase Dashboard → Authentication → Users 中手动删除
-- 或使用 Admin API；SQL 直接删 auth.users 需 service_role 权限
