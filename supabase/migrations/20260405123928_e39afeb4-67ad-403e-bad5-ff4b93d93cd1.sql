
-- 1. Add RESTRICTIVE policy on erp_config to ensure ONLY admins can access
CREATE POLICY "Restrict erp_config to admins only"
ON public.erp_config
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- 3. Create trigger to hash OTP codes on insert
CREATE OR REPLACE FUNCTION public.hash_otp_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Hash the OTP code using bcrypt so plain text is never stored
  NEW.code := extensions.crypt(NEW.code, extensions.gen_salt('bf', 8));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hash_otp_code
BEFORE INSERT ON public.otp_codes
FOR EACH ROW
EXECUTE FUNCTION public.hash_otp_code();

-- 4. Create a secure function to verify OTP without exposing the hash
CREATE OR REPLACE FUNCTION public.verify_otp_code(_phone text, _code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _match boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.otp_codes
    WHERE phone = _phone
      AND verified = false
      AND expires_at > now()
      AND code = extensions.crypt(_code, code)
  ) INTO _match;

  IF _match THEN
    UPDATE public.otp_codes
    SET verified = true
    WHERE phone = _phone
      AND verified = false
      AND expires_at > now()
      AND code = extensions.crypt(_code, code);
  END IF;

  RETURN _match;
END;
$$;
