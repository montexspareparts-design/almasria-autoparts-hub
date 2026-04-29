CREATE OR REPLACE FUNCTION public.list_staff_colleagues()
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ur.user_id,
         COALESCE(p.full_name, NULLIF(split_part(p.email, '@', 1), ''), 'زميل') AS full_name
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role IN ('admin'::app_role, 'moderator'::app_role, 'reporter'::app_role)
    AND public.is_staff(auth.uid())
$$;

GRANT EXECUTE ON FUNCTION public.list_staff_colleagues() TO authenticated;