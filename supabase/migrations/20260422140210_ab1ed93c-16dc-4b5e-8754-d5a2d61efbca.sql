CREATE TABLE public.whatsapp_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  phone text NOT NULL,
  recipient_name text,
  template text,
  message_preview text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  provider_response jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_send_logs_phone ON public.whatsapp_send_logs(phone);
CREATE INDEX idx_whatsapp_send_logs_lead ON public.whatsapp_send_logs(lead_id);
CREATE INDEX idx_whatsapp_send_logs_created ON public.whatsapp_send_logs(created_at DESC);

ALTER TABLE public.whatsapp_send_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view whatsapp send logs"
  ON public.whatsapp_send_logs FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins manage whatsapp send logs"
  ON public.whatsapp_send_logs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));