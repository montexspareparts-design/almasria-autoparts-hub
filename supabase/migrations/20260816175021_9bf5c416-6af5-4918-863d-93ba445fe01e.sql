CREATE OR REPLACE FUNCTION public.protect_order_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'moderator'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.total_amount     IS DISTINCT FROM OLD.total_amount
  OR NEW.shipping_cost    IS DISTINCT FROM OLD.shipping_cost
  OR NEW.coupon_discount  IS DISTINCT FROM OLD.coupon_discount
  OR NEW.coupon_code      IS DISTINCT FROM OLD.coupon_code
  OR NEW.status           IS DISTINCT FROM OLD.status
  OR NEW.payment_method   IS DISTINCT FROM OLD.payment_method
  OR NEW.tracking_number  IS DISTINCT FROM OLD.tracking_number
  OR NEW.bosta_status     IS DISTINCT FROM OLD.bosta_status
  OR NEW.bosta_tracking_number IS DISTINCT FROM OLD.bosta_tracking_number
  OR NEW.user_id          IS DISTINCT FROM OLD.user_id
  OR NEW.order_number     IS DISTINCT FROM OLD.order_number
  THEN
    RAISE EXCEPTION 'Not allowed to modify protected order fields';
  END IF;

  RETURN NEW;
END;
$$;