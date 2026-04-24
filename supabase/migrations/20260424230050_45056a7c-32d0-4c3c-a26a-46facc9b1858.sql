
CREATE TABLE public.visitor_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  source TEXT,
  first_path TEXT,
  referrer TEXT,
  session_key TEXT,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'new',
  staff_notes TEXT,
  contacted_by UUID,
  contacted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_visitor_leads_status ON public.visitor_leads(status);
CREATE INDEX idx_visitor_leads_created ON public.visitor_leads(created_at DESC);
CREATE INDEX idx_visitor_leads_phone ON public.visitor_leads(phone);

ALTER TABLE public.visitor_leads ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can submit a lead
CREATE POLICY "Anyone can submit visitor lead"
ON public.visitor_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Staff can view all leads
CREATE POLICY "Staff can view all visitor leads"
ON public.visitor_leads
FOR SELECT
TO authenticated
USING (is_staff(auth.uid()));

-- Staff can update lead status
CREATE POLICY "Staff can update visitor leads"
ON public.visitor_leads
FOR UPDATE
TO authenticated
USING (is_staff(auth.uid()))
WITH CHECK (is_staff(auth.uid()));

-- Admins can delete
CREATE POLICY "Admins can delete visitor leads"
ON public.visitor_leads
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update timestamp trigger
CREATE TRIGGER update_visitor_leads_updated_at
BEFORE UPDATE ON public.visitor_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
