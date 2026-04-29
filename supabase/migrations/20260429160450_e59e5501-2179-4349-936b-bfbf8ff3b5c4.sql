-- 2) Update is_staff to include reporter
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'moderator'::app_role, 'reporter'::app_role)
  )
$$;

-- 3) Helper: detects "reporter-only" accounts (no admin/moderator role)
CREATE OR REPLACE FUNCTION public.is_reporter_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'reporter'::app_role
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = _user_id
      AND ur2.role IN ('admin'::app_role, 'moderator'::app_role)
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_reporter_only(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_reporter_only(uuid) TO authenticated;
