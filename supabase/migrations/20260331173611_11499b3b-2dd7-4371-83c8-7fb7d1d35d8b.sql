CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number text,
  paymob_transaction_id text,
  amount_cents integer,
  currency text DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  card_last_four text,
  card_brand text,
  is_refunded boolean DEFAULT false,
  is_voided boolean DEFAULT false,
  error_message text,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment transactions"
  ON public.payment_transactions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own payment transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = payment_transactions.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE INDEX idx_payment_transactions_order ON public.payment_transactions(order_number);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX idx_payment_transactions_created ON public.payment_transactions(created_at DESC);