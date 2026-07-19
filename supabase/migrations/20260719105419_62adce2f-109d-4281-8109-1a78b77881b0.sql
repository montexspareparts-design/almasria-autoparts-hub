
-- 1) Lock sensitive fields on orders/order_items for non-staff users via BEFORE UPDATE triggers.

CREATE OR REPLACE FUNCTION public.prevent_customer_order_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Staff bypass entirely
  IF public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'moderator'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Block changes to financial / status / fulfillment fields for the owning customer
  IF NEW.total_amount     IS DISTINCT FROM OLD.total_amount
  OR NEW.subtotal         IS DISTINCT FROM OLD.subtotal
  OR NEW.shipping_cost    IS DISTINCT FROM OLD.shipping_cost
  OR NEW.coupon_discount  IS DISTINCT FROM OLD.coupon_discount
  OR NEW.coupon_code      IS DISTINCT FROM OLD.coupon_code
  OR NEW.tax_amount       IS DISTINCT FROM OLD.tax_amount
  OR NEW.discount_amount  IS DISTINCT FROM OLD.discount_amount
  OR NEW.status           IS DISTINCT FROM OLD.status
  OR NEW.payment_status   IS DISTINCT FROM OLD.payment_status
  OR NEW.payment_method   IS DISTINCT FROM OLD.payment_method
  OR NEW.tracking_number  IS DISTINCT FROM OLD.tracking_number
  OR NEW.bosta_status     IS DISTINCT FROM OLD.bosta_status
  OR NEW.bosta_tracking_number IS DISTINCT FROM OLD.bosta_tracking_number
  OR NEW.user_id          IS DISTINCT FROM OLD.user_id
  OR NEW.order_number     IS DISTINCT FROM OLD.order_number
  OR NEW.order_type       IS DISTINCT FROM OLD.order_type
  THEN
    RAISE EXCEPTION 'Not allowed to modify protected order fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_customer_order_tampering ON public.orders;
CREATE TRIGGER trg_prevent_customer_order_tampering
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_customer_order_tampering();

CREATE OR REPLACE FUNCTION public.prevent_customer_order_item_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'moderator'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Customers cannot modify price/quantity/product on their own order items.
  IF NEW.unit_price   IS DISTINCT FROM OLD.unit_price
  OR NEW.total_price  IS DISTINCT FROM OLD.total_price
  OR NEW.quantity     IS DISTINCT FROM OLD.quantity
  OR NEW.product_id   IS DISTINCT FROM OLD.product_id
  OR NEW.order_id     IS DISTINCT FROM OLD.order_id
  THEN
    RAISE EXCEPTION 'Not allowed to modify protected order item fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_customer_order_item_tampering ON public.order_items;
CREATE TRIGGER trg_prevent_customer_order_item_tampering
BEFORE UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.prevent_customer_order_item_tampering();

-- 2) Scope staff realtime subscription policy to staff-related topic namespaces
--    instead of any topic.
DROP POLICY IF EXISTS "Staff subscribe to any topic" ON realtime.messages;

CREATE POLICY "Staff subscribe to staff topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.is_staff(auth.uid())
  AND (
    realtime.topic() LIKE 'staff:%'
    OR realtime.topic() LIKE 'admin:%'
    OR realtime.topic() LIKE 'moderator:%'
    OR realtime.topic() LIKE 'reporter:%'
    OR realtime.topic() LIKE 'crm:%'
  )
);
