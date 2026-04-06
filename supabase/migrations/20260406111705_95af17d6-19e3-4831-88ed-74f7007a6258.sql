
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  shop_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage leads" ON public.leads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
