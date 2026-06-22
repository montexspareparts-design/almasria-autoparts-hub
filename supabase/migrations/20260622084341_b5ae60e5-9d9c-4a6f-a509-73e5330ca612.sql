
-- 1) Shipments table
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  carrier TEXT NOT NULL DEFAULT 'bosta',
  tracking_number TEXT,
  delivery_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  status_code INTEGER,
  pricing_amount NUMERIC,
  raw_response JSONB,
  last_event JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, carrier)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipments TO authenticated;
GRANT ALL ON public.shipments TO service_role;

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage all shipments"
ON public.shipments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Customers can view their own shipments"
ON public.shipments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = shipments.order_id AND o.user_id = auth.uid()
  )
);

CREATE INDEX idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX idx_shipments_tracking_number ON public.shipments(tracking_number);
CREATE INDEX idx_shipments_delivery_id ON public.shipments(delivery_id);

CREATE TRIGGER update_shipments_updated_at
BEFORE UPDATE ON public.shipments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Bosta webhook events log
CREATE TABLE public.bosta_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT,
  tracking_number TEXT,
  delivery_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bosta_webhook_events TO authenticated;
GRANT ALL ON public.bosta_webhook_events TO service_role;

ALTER TABLE public.bosta_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook events"
ON public.bosta_webhook_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_bosta_webhook_tracking ON public.bosta_webhook_events(tracking_number);
CREATE INDEX idx_bosta_webhook_created_at ON public.bosta_webhook_events(created_at DESC);

-- 3) Quick-access columns on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bosta_tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS bosta_delivery_id TEXT,
  ADD COLUMN IF NOT EXISTS bosta_status TEXT;
