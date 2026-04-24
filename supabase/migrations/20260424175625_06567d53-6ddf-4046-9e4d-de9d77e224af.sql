CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _phone text;
  _email text;
  _profile_email text;
  _whatsapp_opt_in boolean;
BEGIN
  _phone := COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), NULL);
  _email := NEW.email;
  _whatsapp_opt_in := COALESCE((NEW.raw_user_meta_data->>'whatsapp_opt_in')::boolean, false);

  -- If signup was via phone (synthetic email), extract phone from local part
  IF _phone IS NULL AND _email LIKE '%@phone.almasria.local' THEN
    _phone := split_part(_email, '@', 1);
  END IF;

  -- Don't store the synthetic phone email in the profile email field
  IF _email LIKE '%@phone.almasria.local' THEN
    _profile_email := NULL;
  ELSE
    _profile_email := _email;
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, phone, car_model, car_year, whatsapp_opt_in)
  VALUES (
    NEW.id,
    _profile_email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    _phone,
    NEW.raw_user_meta_data->>'car_model',
    (NEW.raw_user_meta_data->>'car_year')::integer,
    _whatsapp_opt_in
  );
  RETURN NEW;
END;
$function$;