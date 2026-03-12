
-- Dealer favorites table
CREATE TABLE public.dealer_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.dealer_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers can view own favorites" ON public.dealer_favorites
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Dealers can insert own favorites" ON public.dealer_favorites
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Dealers can delete own favorites" ON public.dealer_favorites
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all favorites" ON public.dealer_favorites
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Price lists table (admin uploads price sheets)
CREATE TABLE public.price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_url text,
  version text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active dealers can view price lists" ON public.price_lists
  FOR SELECT TO authenticated
  USING (is_active = true AND EXISTS (
    SELECT 1 FROM dealer_accounts WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Admins can manage price lists" ON public.price_lists
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_price_lists_updated_at
  BEFORE UPDATE ON public.price_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
