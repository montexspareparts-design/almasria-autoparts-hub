
-- Customer internal notes table
CREATE TABLE public.customer_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_user_id UUID NOT NULL,
  staff_user_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

-- Staff can view all notes
CREATE POLICY "Staff can view all customer notes"
  ON public.customer_notes FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Staff can insert notes
CREATE POLICY "Staff can insert customer notes"
  ON public.customer_notes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND staff_user_id = auth.uid());

-- Staff can delete own notes
CREATE POLICY "Staff can delete own notes"
  ON public.customer_notes FOR DELETE
  TO authenticated
  USING (staff_user_id = auth.uid());

-- Admins can manage all notes
CREATE POLICY "Admins can manage all customer notes"
  ON public.customer_notes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
