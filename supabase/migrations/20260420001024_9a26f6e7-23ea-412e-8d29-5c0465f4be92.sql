-- Create support request transfers table
CREATE TABLE public.support_request_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  support_request_id uuid NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  from_staff_id uuid NOT NULL,
  to_staff_id uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_request_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all transfers"
  ON public.support_request_transfers FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert own transfers"
  ON public.support_request_transfers FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND from_staff_id = auth.uid());

CREATE POLICY "Admins can manage transfers"
  ON public.support_request_transfers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_support_transfers_request ON public.support_request_transfers(support_request_id);
CREATE INDEX idx_support_transfers_to ON public.support_request_transfers(to_staff_id);

-- Trigger to notify the receiving staff
CREATE OR REPLACE FUNCTION public.notify_staff_on_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _from_name text;
  _customer_name text;
BEGIN
  SELECT COALESCE(full_name, email, 'موظف') INTO _from_name
  FROM public.profiles WHERE user_id = NEW.from_staff_id LIMIT 1;

  SELECT COALESCE(customer_name, 'عميل') INTO _customer_name
  FROM public.support_requests WHERE id = NEW.support_request_id LIMIT 1;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.to_staff_id,
    '🤝 طلب محول إليك',
    _from_name || ' حول لك طلب من ' || _customer_name ||
    CASE WHEN NEW.note IS NOT NULL AND NEW.note != '' THEN ' — ملاحظة: ' || NEW.note ELSE '' END,
    'support_transfer'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_staff_on_transfer
AFTER INSERT ON public.support_request_transfers
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_on_transfer();