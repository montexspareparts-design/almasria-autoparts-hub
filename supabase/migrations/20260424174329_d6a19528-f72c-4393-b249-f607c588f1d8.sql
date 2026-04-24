-- Fix 1: Update handle_new_user trigger to save phone from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _phone text;
  _email text;
BEGIN
  -- Extract phone from metadata
  _phone := COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), NULL);
  _email := NEW.email;

  -- If signup was via phone (synthetic email), extract phone from local part
  IF _phone IS NULL AND _email LIKE '%@phone.almasria.local' THEN
    _phone := split_part(_email, '@', 1);
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, phone, car_model, car_year)
  VALUES (
    NEW.id,
    _email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    _phone,
    NEW.raw_user_meta_data->>'car_model',
    (NEW.raw_user_meta_data->>'car_year')::integer
  );
  RETURN NEW;
END;
$function$;

-- Fix 2: Backfill phone for existing accounts that signed up via phone
UPDATE public.profiles
SET phone = split_part(email, '@', 1)
WHERE email LIKE '%@phone.almasria.local'
  AND (phone IS NULL OR phone = '');