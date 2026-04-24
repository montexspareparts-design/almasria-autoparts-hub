-- Track explicit "open customer file" clicks by staff (separate from passive page-landing tracker)
CREATE TABLE public.staff_customer_file_opens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL,
  customer_user_id UUID,
  visitor_session_id TEXT,
  source TEXT NOT NULL DEFAULT 'unknown', -- e.g. 'admin_customer_intelligence', 'staff_home', 'leads_panel'
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (customer_user_id IS NOT NULL OR visitor_session_id IS NOT NULL)
);

CREATE INDEX staff_customer_file_opens_staff_idx
  ON public.staff_customer_file_opens (staff_user_id, opened_at DESC);

CREATE INDEX staff_customer_file_opens_customer_idx
  ON public.staff_customer_file_opens (customer_user_id, opened_at DESC);

CREATE INDEX staff_customer_file_opens_session_idx
  ON public.staff_customer_file_opens (visitor_session_id, opened_at DESC);

ALTER TABLE public.staff_customer_file_opens ENABLE ROW LEVEL SECURITY;

-- Only staff (admin/moderator) can insert, and only as themselves
CREATE POLICY "Staff insert own file open events"
  ON public.staff_customer_file_opens
  FOR INSERT
  TO authenticated
  WITH CHECK (is_staff(auth.uid()) AND staff_user_id = auth.uid());

-- Staff can view all events (for admin analytics)
CREATE POLICY "Staff view all file open events"
  ON public.staff_customer_file_opens
  FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

-- Block updates and deletes from clients
CREATE POLICY "Block client updates on file opens"
  ON public.staff_customer_file_opens
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Block client deletes on file opens"
  ON public.staff_customer_file_opens
  FOR DELETE
  TO authenticated
  USING (false);