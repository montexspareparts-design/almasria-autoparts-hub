
-- 1) Trigger: prevent non-admin users from changing price fields on order_items
CREATE OR REPLACE FUNCTION public.protect_order_item_prices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Admins can do anything
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Non-admins cannot change price fields
  IF NEW.unit_price IS DISTINCT FROM OLD.unit_price OR NEW.total_price IS DISTINCT FROM OLD.total_price THEN
    RAISE EXCEPTION 'You are not allowed to modify price fields';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_order_item_prices
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_order_item_prices();

-- 2) Trigger: prevent non-admin users from changing status or total_amount on orders
CREATE OR REPLACE FUNCTION public.protect_order_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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
$$;

CREATE TRIGGER trg_protect_order_sensitive_fields
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_order_sensitive_fields();
