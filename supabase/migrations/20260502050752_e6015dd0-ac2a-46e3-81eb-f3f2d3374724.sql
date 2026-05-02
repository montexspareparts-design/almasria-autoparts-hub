-- يرجع (user_id, full_name) لقائمة موظفين محدّدة، فقط لو الطالب نفسه عضو فريق
CREATE OR REPLACE FUNCTION public.get_staff_display_names(_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id,
         COALESCE(NULLIF(TRIM(p.full_name), ''), SPLIT_PART(p.email, '@', 1), 'زميل') AS full_name
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids)
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'moderator'::app_role)
      OR has_role(auth.uid(), 'reporter'::app_role)
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_staff_display_names(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_staff_display_names(uuid[]) TO authenticated;