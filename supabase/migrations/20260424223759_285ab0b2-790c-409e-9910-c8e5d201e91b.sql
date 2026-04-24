CREATE TABLE IF NOT EXISTS public.staff_passwords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL,
  initial_password TEXT NOT NULL,
  created_by UUID,
  viewed_by UUID,
  viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_passwords_staff_user_id ON public.staff_passwords(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_passwords_created_at ON public.staff_passwords(created_at DESC);

ALTER TABLE public.staff_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage staff passwords"
ON public.staff_passwords
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));