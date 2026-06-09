-- 最多 2 个管理员：SQL Editor → Create a new snippet → Run
-- 与 .env ADMIN_EMAILS（最多 2 个）配合使用

CREATE OR REPLACE FUNCTION public.profiles_limit_admins()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  IF NEW.role = 'admin' AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM 'admin') THEN
    SELECT COUNT(*)::INTEGER INTO admin_count
    FROM public.profiles
    WHERE role = 'admin' AND id IS DISTINCT FROM NEW.id;

    IF admin_count >= 2 THEN
      RAISE EXCEPTION 'maximum 2 admin accounts allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_limit_admins_trigger ON public.profiles;
CREATE TRIGGER profiles_limit_admins_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'admin')
  EXECUTE FUNCTION public.profiles_limit_admins();
