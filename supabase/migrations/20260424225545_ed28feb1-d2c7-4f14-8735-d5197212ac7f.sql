-- Track which staff member viewed which customer/visitor session
CREATE TABLE public.visitor_session_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid NOT NULL,
  -- one of these will be set: customer_user_id (for registered) OR session_key (for anonymous)
  customer_user_id uuid,
  session_key text,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  view_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT visitor_view_target_check CHECK (
    (customer_user_id IS NOT NULL AND session_key IS NULL) OR
    (customer_user_id IS NULL AND session_key IS NOT NULL)
  )
);

-- Unique pair so we can upsert (one row per staff+target)
CREATE UNIQUE INDEX visitor_session_views_user_unique
  ON public.visitor_session_views (staff_user_id, customer_user_id)
  WHERE customer_user_id IS NOT NULL;

CREATE UNIQUE INDEX visitor_session_views_anon_unique
  ON public.visitor_session_views (staff_user_id, session_key)
  WHERE session_key IS NOT NULL;

CREATE INDEX visitor_session_views_target_idx
  ON public.visitor_session_views (customer_user_id, session_key);

ALTER TABLE public.visitor_session_views ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admins manage all session views"
  ON public.visitor_session_views FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Staff (admin + moderator) can read all view records (so everyone sees who viewed)
CREATE POLICY "Staff view all session views"
  ON public.visitor_session_views FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));

-- Staff can insert their own view records
CREATE POLICY "Staff insert own views"
  ON public.visitor_session_views FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()) AND staff_user_id = auth.uid());

-- Staff can update only their own view records (for incrementing count)
CREATE POLICY "Staff update own views"
  ON public.visitor_session_views FOR UPDATE TO authenticated
  USING (staff_user_id = auth.uid());