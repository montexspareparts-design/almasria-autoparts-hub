CREATE OR REPLACE FUNCTION public.protect_order_sensitive_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Service role (auth.uid() is null in webhook context) can do anything
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Staff (admin + moderator) can do anything
  IF public.is_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Non-staff cannot change status
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'You are not allowed to modify order status';
  END IF;

  -- Non-staff cannot change total_amount
  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    RAISE EXCEPTION 'You are not allowed to modify order total';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_order_item_prices()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Staff (admin + moderator) can do anything
  IF auth.uid() IS NOT NULL AND public.is_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Non-staff cannot change price fields
  IF NEW.unit_price IS DISTINCT FROM OLD.unit_price OR NEW.total_price IS DISTINCT FROM OLD.total_price THEN
    RAISE EXCEPTION 'You are not allowed to modify price fields';
  END IF;

  RETURN NEW;
END;
$function$;