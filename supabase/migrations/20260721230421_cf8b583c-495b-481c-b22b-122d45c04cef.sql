CREATE OR REPLACE FUNCTION public.save_my_profile_phone(_phone text, _whatsapp_opt_in boolean DEFAULT true)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _normalized text;
  _profile public.profiles;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  _normalized := public.normalize_eg_phone(_phone);

  IF _normalized IS NULL OR _normalized !~ '^01[0-9]{9}$' THEN
    RAISE EXCEPTION 'invalid_phone' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE phone = _normalized
      AND user_id <> _uid
  ) THEN
    RAISE EXCEPTION 'phone_already_registered' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.profiles (user_id, phone, whatsapp_opt_in)
  VALUES (_uid, _normalized, COALESCE(_whatsapp_opt_in, false))
  ON CONFLICT (user_id) DO UPDATE
  SET phone = EXCLUDED.phone,
      whatsapp_opt_in = EXCLUDED.whatsapp_opt_in,
      updated_at = now()
  RETURNING * INTO _profile;

  RETURN _profile;
END;
$$;

REVOKE ALL ON FUNCTION public.save_my_profile_phone(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_my_profile_phone(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_my_profile_phone(text, boolean) TO service_role;