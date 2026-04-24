-- Add WhatsApp opt-in flag to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false;

-- Update handle_new_user to capture optional phone + whatsapp opt-in from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _phone text;
  _email text;
  _whatsapp_opt_in boolean;
BEGIN
  _phone := COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), NULL);
  _email := NEW.email;
  _whatsapp_opt_in := COALESCE((NEW.raw_user_meta_data->>'whatsapp_opt_in')::boolean, false);

  IF _phone IS NULL AND _email LIKE '%@phone.almasria.local' THEN
    _phone := split_part(_email, '@', 1);
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, phone, car_model, car_year, whatsapp_opt_in)
  VALUES (
    NEW.id,
    _email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    _phone,
    NEW.raw_user_meta_data->>'car_model',
    (NEW.raw_user_meta_data->>'car_year')::integer,
    _whatsapp_opt_in
  );
  RETURN NEW;
END;
$function$;