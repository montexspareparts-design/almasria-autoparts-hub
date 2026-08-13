CREATE TABLE IF NOT EXISTS public.payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'geidea',
  event_type text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number text,
  session_id text,
  provider_order_id text,
  amount numeric,
  currency text DEFAULT 'EGP',
  status text,
  signature_valid boolean,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_order_number ON public.payment_logs(order_number);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON public.payment_logs(created_at DESC);

GRANT ALL ON public.payment_logs TO service_role;
GRANT SELECT ON public.payment_logs TO authenticated;

ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment logs"
ON public.payment_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));