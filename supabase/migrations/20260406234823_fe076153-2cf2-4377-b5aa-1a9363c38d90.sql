
-- Table to track which products a dealer has already ordered (locked until stock increases)
CREATE TABLE public.dealer_product_order_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stock_at_order integer NOT NULL,
  quantity_ordered integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id, stock_at_order)
);

ALTER TABLE public.dealer_product_order_locks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Dealers can view own locks" ON public.dealer_product_order_locks
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all locks" ON public.dealer_product_order_locks
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-insert locks when order items are created
CREATE OR REPLACE FUNCTION public.lock_dealer_product_after_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _stock integer;
BEGIN
  -- Get user from order
  SELECT user_id INTO _user_id FROM public.orders WHERE id = NEW.order_id;
  IF _user_id IS NULL THEN RETURN NEW; END IF;

  -- Get current stock
  SELECT stock_quantity INTO _stock FROM public.products WHERE id = NEW.product_id;

  -- Insert or update lock
  INSERT INTO public.dealer_product_order_locks (user_id, product_id, stock_at_order, quantity_ordered)
  VALUES (_user_id, NEW.product_id, COALESCE(_stock, 0), NEW.quantity)
  ON CONFLICT (user_id, product_id, stock_at_order) 
  DO UPDATE SET quantity_ordered = dealer_product_order_locks.quantity_ordered + EXCLUDED.quantity_ordered;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lock_dealer_product_after_order
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.lock_dealer_product_after_order();
