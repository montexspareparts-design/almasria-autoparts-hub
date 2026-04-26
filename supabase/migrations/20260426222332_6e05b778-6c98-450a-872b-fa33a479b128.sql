-- Create enum for pipeline stages
CREATE TYPE public.visitor_pipeline_stage AS ENUM (
  'new',
  'interested',
  'quote_sent',
  'contacted',
  'not_interested',
  'won'
);

-- Pipeline status per visitor (user_id OR session_key)
CREATE TABLE public.visitor_pipeline_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id uuid,
  visitor_session_key text,
  stage public.visitor_pipeline_stage NOT NULL DEFAULT 'new',
  notes text,
  updated_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pipeline_target_check CHECK (customer_user_id IS NOT NULL OR visitor_session_key IS NOT NULL)
);

-- Unique per visitor (one row per user_id, one per session_key)
CREATE UNIQUE INDEX visitor_pipeline_user_uniq
  ON public.visitor_pipeline_status (customer_user_id)
  WHERE customer_user_id IS NOT NULL;
CREATE UNIQUE INDEX visitor_pipeline_session_uniq
  ON public.visitor_pipeline_status (visitor_session_key)
  WHERE visitor_session_key IS NOT NULL AND customer_user_id IS NULL;
CREATE INDEX idx_visitor_pipeline_stage ON public.visitor_pipeline_status (stage);
CREATE INDEX idx_visitor_pipeline_updated ON public.visitor_pipeline_status (updated_at DESC);

ALTER TABLE public.visitor_pipeline_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view all pipeline statuses"
  ON public.visitor_pipeline_status FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff insert pipeline statuses"
  ON public.visitor_pipeline_status FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND updated_by = auth.uid());

CREATE POLICY "Staff update pipeline statuses"
  ON public.visitor_pipeline_status FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()) AND updated_by = auth.uid());

CREATE POLICY "Admins manage pipeline statuses"
  ON public.visitor_pipeline_status FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at trigger
CREATE TRIGGER trg_visitor_pipeline_updated_at
  BEFORE UPDATE ON public.visitor_pipeline_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();