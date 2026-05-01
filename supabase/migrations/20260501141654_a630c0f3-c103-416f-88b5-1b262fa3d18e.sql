
CREATE TABLE public.staff_task_handling (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('call','whatsapp','note','outcome','manual')),
  handled_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Cairo')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, handled_date)
);

CREATE INDEX idx_staff_task_handling_date ON public.staff_task_handling (handled_date DESC);
CREATE INDEX idx_staff_task_handling_task ON public.staff_task_handling (task_id);
CREATE INDEX idx_staff_task_handling_staff ON public.staff_task_handling (staff_user_id, handled_date DESC);

ALTER TABLE public.staff_task_handling ENABLE ROW LEVEL SECURITY;

-- Any staff (admin/moderator/dealer-staff) can view all handling records (to avoid duplicate work)
CREATE POLICY "Staff can view all task handling"
ON public.staff_task_handling FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- Staff can insert only their own handling
CREATE POLICY "Staff can insert their own handling"
ON public.staff_task_handling FOR INSERT
TO authenticated
WITH CHECK (
  staff_user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);

-- Owner or admin can delete
CREATE POLICY "Owner or admin can delete handling"
ON public.staff_task_handling FOR DELETE
TO authenticated
USING (
  staff_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_task_handling;
ALTER TABLE public.staff_task_handling REPLICA IDENTITY FULL;
