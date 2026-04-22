
CREATE TABLE public.client_account_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_by uuid,
  attempt_type text NOT NULL,
  status text NOT NULL,
  lead_id uuid,
  phone text,
  erp_customer_code text,
  client_name text,
  error_message text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_caa_created_at ON public.client_account_attempts(created_at DESC);
CREATE INDEX idx_caa_status ON public.client_account_attempts(status);
CREATE INDEX idx_caa_attempted_by ON public.client_account_attempts(attempted_by);

ALTER TABLE public.client_account_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view account attempts"
  ON public.client_account_attempts FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert account attempts"
  ON public.client_account_attempts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND attempted_by = auth.uid());

CREATE POLICY "Block updates and deletes"
  ON public.client_account_attempts FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
