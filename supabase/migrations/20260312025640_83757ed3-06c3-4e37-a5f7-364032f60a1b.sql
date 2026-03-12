-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Anyone can check phone/email existence" ON public.dealer_applications;

-- Create a secure function to check for duplicates
CREATE OR REPLACE FUNCTION public.check_dealer_application_exists(
  _phone text DEFAULT NULL,
  _email text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phone_exists boolean := false;
  email_exists boolean := false;
BEGIN
  IF _phone IS NOT NULL AND _phone != '' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.dealer_applications WHERE phone = _phone
    ) INTO phone_exists;
  END IF;
  
  IF _email IS NOT NULL AND _email != '' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.dealer_applications WHERE email = _email
    ) INTO email_exists;
  END IF;
  
  RETURN json_build_object('phone_exists', phone_exists, 'email_exists', email_exists);
END;
$$;