
CREATE TABLE public.price_list_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id uuid NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.price_list_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all price list views"
  ON public.price_list_views FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Dealers can insert own views"
  ON public.price_list_views FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_price_list_views_list ON public.price_list_views(price_list_id);
CREATE INDEX idx_price_list_views_user ON public.price_list_views(user_id);
