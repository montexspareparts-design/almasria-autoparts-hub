-- 1. Fix otp_codes: drop the permissive "false" policy and replace with proper restrictive policies
DROP POLICY IF EXISTS "Service role only" ON public.otp_codes;

-- Block ALL operations for anon and authenticated roles (service_role bypasses RLS)
CREATE POLICY "Block all access for non-service roles"
ON public.otp_codes
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- 2. Fix user_roles: add explicit restrictive policy preventing non-admin inserts
CREATE POLICY "Block non-admin inserts"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));