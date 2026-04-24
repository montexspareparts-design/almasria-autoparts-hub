CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _phone_raw text;
  _phone text;
  _email text;
  _profile_email text;
  _whatsapp_opt_in boolean;
BEGIN
  _phone_raw := COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), NULL);
  _email := NEW.email;
  _whatsapp_opt_in := COALESCE((NEW.raw_user_meta_data->>'whatsapp_opt_in')::boolean, false);

  -- Fallback: extract phone from synthetic email if not provided in metadata
  IF _phone_raw IS NULL AND _email LIKE '%@phone.almasria.local' THEN
    _phone_raw := split_part(_email, '@', 1);
  END IF;

  -- Normalize: strip everything except digits
  IF _phone_raw IS NOT NULL THEN
    _phone := regexp_replace(_phone_raw, '\D', '', 'g');
    -- Convert +20XXXXXXXXXX or 0020XXXXXXXXXX to 0XXXXXXXXXX
    IF _phone LIKE '0020%' THEN
      _phone := '0' || substring(_phone from 5);
    ELSIF _phone LIKE '20%' AND length(_phone) = 12 THEN
      _phone := '0' || substring(_phone from 3);
    END IF;
    -- Add leading 0 if missing (10-digit Egyptian mobile starting with 1)
    IF length(_phone) = 10 AND _phone LIKE '1%' THEN
      _phone := '0' || _phone;
    END IF;
    -- Final guard: must be 11 digits starting with 01
    IF length(_phone) <> 11 OR _phone NOT LIKE '01%' THEN
      _phone := _phone_raw; -- keep raw if normalization fails
    END IF;
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