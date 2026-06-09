-- 将指定邮箱设为管理员：SQL Editor → Create a new snippet → Run
UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE lower(email) = lower('ming2519998496@gmail.com');

-- 若尚无 profile（极少见），可先登录一次网站再执行；或查看 auth.users：
-- SELECT id, email FROM auth.users WHERE lower(email) = lower('ming2519998496@gmail.com');

SELECT id, email, role FROM public.profiles
WHERE lower(email) = lower('ming2519998496@gmail.com');
