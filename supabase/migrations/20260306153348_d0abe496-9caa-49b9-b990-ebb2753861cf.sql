
-- Table to track dealer daily product price views
CREATE TABLE public.dealer_price_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  view_date date NOT NULL DEFAULT CURRENT_DATE
);

-- Index for fast lookups
CREATE INDEX idx_dealer_price_views_user_date ON public.dealer_price_views(user_id, view_date);
-- Unique constraint: one view per product per user per day
CREATE UNIQUE INDEX idx_dealer_price_views_unique ON public.dealer_price_views(user_id, product_id, view_date);

-- Enable RLS
ALTER TABLE public.dealer_price_views ENABLE ROW LEVEL SECURITY;

-- Users can insert their own views
CREATE POLICY "Users can insert own views"
  ON public.dealer_price_views FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can read own views
CREATE POLICY "Users can read own views"
  ON public.dealer_price_views FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can manage all
CREATE POLICY "Admins can manage views"
  ON public.dealer_price_views FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to get today's view count for a user
CREATE OR REPLACE FUNCTION public.get_daily_view_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT product_id)::integer
  FROM public.dealer_price_views
  WHERE user_id = _user_id AND view_date = CURRENT_DATE
$$;
