-- 1) Customer assignments: link customers/leads to staff
CREATE TABLE IF NOT EXISTS public.customer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL,
  assigned_staff_id UUID NOT NULL,
  assigned_by UUID,
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_user_id)
);

ALTER TABLE public.customer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all assignments"
  ON public.customer_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff view own assignments"
  ON public.customer_assignments FOR SELECT TO authenticated
  USING (assigned_staff_id = auth.uid() OR is_staff(auth.uid()));

CREATE POLICY "Staff insert own assignments"
  ON public.customer_assignments FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()) AND assigned_by = auth.uid());

CREATE POLICY "Staff update own assignments"
  ON public.customer_assignments FOR UPDATE TO authenticated
  USING (assigned_staff_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_customer_assignments_updated_at
  BEFORE UPDATE ON public.customer_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_customer_assignments_staff ON public.customer_assignments(assigned_staff_id);
CREATE INDEX idx_customer_assignments_customer ON public.customer_assignments(customer_user_id);

-- 2) Customer sessions: track when customers visit/login
CREATE TABLE IF NOT EXISTS public.customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  page_views INTEGER NOT NULL DEFAULT 1,
  UNIQUE (user_id, session_date)
);

ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view all sessions"
  ON public.customer_sessions FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "Users insert own sessions"
  ON public.customer_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own sessions"
  ON public.customer_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_customer_sessions_date ON public.customer_sessions(session_date DESC);
CREATE INDEX idx_customer_sessions_user ON public.customer_sessions(user_id);

-- 3) Staff contact marks: dismiss customer from urgent list for the day
CREATE TABLE IF NOT EXISTS public.staff_contact_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL,
  staff_user_id UUID NOT NULL,
  context TEXT NOT NULL DEFAULT 'follow_up',
  marked_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_user_id, context, marked_date)
);

ALTER TABLE public.staff_contact_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage contact marks"
  ON public.staff_contact_marks FOR ALL TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()) AND staff_user_id = auth.uid());

CREATE INDEX idx_contact_marks_date ON public.staff_contact_marks(marked_date DESC);