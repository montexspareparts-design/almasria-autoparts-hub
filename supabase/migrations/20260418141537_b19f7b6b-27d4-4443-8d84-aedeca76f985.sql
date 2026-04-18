CREATE TABLE public.price_change_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  old_price NUMERIC NOT NULL,
  new_price NUMERIC NOT NULL,
  change_percentage NUMERIC NOT NULL,
  source TEXT NOT NULL DEFAULT 'erp_webhook',
  notified_dealers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_change_history_product ON public.price_change_history(product_id, created_at DESC);
CREATE INDEX idx_price_change_history_created ON public.price_change_history(created_at DESC);

ALTER TABLE public.price_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view price history"
ON public.price_change_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators can view price history"
ON public.price_change_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));