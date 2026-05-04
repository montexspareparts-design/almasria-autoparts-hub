-- Returns the set of user_ids that hold any staff role (admin/moderator/reporter)
-- Used client-side to filter staff out of "customer" lists (e.g. Touched Today panel)
-- without leaking the full user_roles table to non-admins.
CREATE OR REPLACE FUNCTION public.get_staff_user_ids()
RETURNS TABLE (user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role IN ('admin','moderator','reporter')
$$;

REVOKE ALL ON FUNCTION public.get_staff_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_staff_user_ids() TO authenticated;