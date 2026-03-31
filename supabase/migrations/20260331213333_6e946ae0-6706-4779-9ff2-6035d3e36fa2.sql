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

  -- Admins can do anything
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Non-admins cannot change status
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'You are not allowed to modify order status';
  END IF;

  -- Non-admins cannot change total_amount
  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    RAISE EXCEPTION 'You are not allowed to modify order total';
  END IF;

  RETURN NEW;
END;
$function$;