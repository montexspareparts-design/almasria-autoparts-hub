
-- Dealer quotes table
CREATE TABLE public.dealer_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quote_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dealer_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers can view own quotes" ON public.dealer_quotes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Dealers can create quotes" ON public.dealer_quotes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Dealers can update own quotes" ON public.dealer_quotes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Dealers can delete own draft quotes" ON public.dealer_quotes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'draft');

CREATE POLICY "Admins can manage all quotes" ON public.dealer_quotes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Quote items table
CREATE TABLE public.dealer_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.dealer_quotes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0
);

ALTER TABLE public.dealer_quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quote items" ON public.dealer_quote_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dealer_quotes WHERE id = quote_id AND user_id = auth.uid()));

CREATE POLICY "Users can manage own quote items" ON public.dealer_quote_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dealer_quotes WHERE id = quote_id AND user_id = auth.uid()));

CREATE POLICY "Admins can manage all quote items" ON public.dealer_quote_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_dealer_quotes_updated_at
  BEFORE UPDATE ON public.dealer_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
