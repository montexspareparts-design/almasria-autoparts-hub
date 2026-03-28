
-- Shopping Lists for dealers
CREATE TABLE public.dealer_shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.dealer_shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.dealer_shopping_lists(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(list_id, product_id)
);

ALTER TABLE public.dealer_shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lists" ON public.dealer_shopping_lists
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all lists" ON public.dealer_shopping_lists
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own list items" ON public.dealer_shopping_list_items
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.dealer_shopping_lists WHERE id = dealer_shopping_list_items.list_id AND user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.dealer_shopping_lists WHERE id = dealer_shopping_list_items.list_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all list items" ON public.dealer_shopping_list_items
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
