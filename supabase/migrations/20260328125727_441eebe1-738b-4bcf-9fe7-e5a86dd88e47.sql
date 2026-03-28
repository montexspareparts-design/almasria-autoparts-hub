
-- B2B Cart table for dealers (database-persisted cart)
CREATE TABLE public.dealer_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.dealer_cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers can view own cart" ON public.dealer_cart_items
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Dealers can insert own cart items" ON public.dealer_cart_items
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Dealers can update own cart items" ON public.dealer_cart_items
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Dealers can delete own cart items" ON public.dealer_cart_items
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all cart items" ON public.dealer_cart_items
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
