
CREATE TABLE public.customer_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id uuid NOT NULL,
  staff_user_id uuid NOT NULL,
  comm_type text NOT NULL DEFAULT 'phone',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all communications"
  ON public.customer_communications FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert communications"
  ON public.customer_communications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND staff_user_id = auth.uid());

CREATE POLICY "Staff can delete own communications"
  ON public.customer_communications FOR DELETE
  TO authenticated
  USING (staff_user_id = auth.uid());

CREATE POLICY "Admins can manage all communications"
  ON public.customer_communications FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
