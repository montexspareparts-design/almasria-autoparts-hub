CREATE TABLE public.client_error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  code text,
  error_name text,
  error_message text,
  stack text,
  component_stack text,
  route text,
  platform text,
  is_native boolean,
  build_commit text,
  build_number text,
  user_agent text
);
GRANT INSERT ON public.client_error_reports TO anon, authenticated;
GRANT SELECT ON public.client_error_reports TO authenticated;
GRANT ALL ON public.client_error_reports TO service_role;
ALTER TABLE public.client_error_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can report a client error" ON public.client_error_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view client error reports" ON public.client_error_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_client_error_reports_created_at ON public.client_error_reports (created_at DESC);