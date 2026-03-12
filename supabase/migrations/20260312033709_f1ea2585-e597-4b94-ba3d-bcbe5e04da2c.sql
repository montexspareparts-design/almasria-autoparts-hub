CREATE TABLE public.price_list_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id uuid NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  UNIQUE(price_list_id, product_id)
);

ALTER TABLE public.price_list_products ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage price list products"
ON public.price_list_products FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Active dealers can view
CREATE POLICY "Active dealers can view price list products"
ON public.price_list_products FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.dealer_accounts
  WHERE user_id = auth.uid() AND is_active = true
));