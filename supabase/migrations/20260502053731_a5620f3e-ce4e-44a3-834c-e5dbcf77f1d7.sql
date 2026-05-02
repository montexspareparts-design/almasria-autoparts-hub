-- جدول مبررات الأيام اللي مقدمش فيها الموظف تقرير
CREATE TABLE IF NOT EXISTS public.reporter_missing_report_justifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  missed_date date NOT NULL,
  reason_type text NOT NULL DEFAULT 'other', -- 'day_off' | 'sick' | 'forgot' | 'no_work' | 'other'
  reason_text text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, missed_date)
);

ALTER TABLE public.reporter_missing_report_justifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage own justifications"
  ON public.reporter_missing_report_justifications FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND is_staff(auth.uid()));

CREATE POLICY "Admins view all justifications"
  ON public.reporter_missing_report_justifications FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage all justifications"
  ON public.reporter_missing_report_justifications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_missing_just_user_date 
  ON public.reporter_missing_report_justifications(user_id, missed_date DESC);

-- RPC: ترجع timeline يومي للموظف لمدى مخصص (max ~1 سنة)
-- status: 'submitted' | 'day_off' | 'justified' | 'missing' | 'future'
CREATE OR REPLACE FUNCTION public.get_reporter_daily_timeline(
  _user_id uuid,
  _from date,
  _to date
)
RETURNS TABLE (
  day date,
  status text,
  report_id uuid,
  quotations_count integer,
  calls_count integer,
  whatsapp_count integer,
  offers_converted_count integer,
  self_rating integer,
  day_off_reason text,
  justification_type text,
  justification_text text,
  submitted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT generate_series(_from, _to, '1 day'::interval)::date AS day
  ),
  rep AS (
    SELECT report_date, id, quotations_count, calls_count, whatsapp_count, 
           offers_converted_count, self_rating, submitted_at, is_submitted
    FROM reporter_daily_reports
    WHERE user_id = _user_id AND report_date BETWEEN _from AND _to
  ),
  doff AS (
    SELECT off_date, reason FROM reporter_day_off
    WHERE user_id = _user_id AND off_date BETWEEN _from AND _to
  ),
  just AS (
    SELECT missed_date, reason_type, reason_text, submitted_at
    FROM reporter_missing_report_justifications
    WHERE user_id = _user_id AND missed_date BETWEEN _from AND _to
  )
  SELECT
    d.day,
    CASE
      WHEN d.day > CURRENT_DATE THEN 'future'
      WHEN r.id IS NOT NULL THEN 'submitted'
      WHEN o.off_date IS NOT NULL THEN 'day_off'
      WHEN j.missed_date IS NOT NULL THEN 'justified'
      ELSE 'missing'
    END AS status,
    r.id AS report_id,
    COALESCE(r.quotations_count, 0),
    COALESCE(r.calls_count, 0),
    COALESCE(r.whatsapp_count, 0),
    COALESCE(r.offers_converted_count, 0),
    r.self_rating,
    o.reason AS day_off_reason,
    j.reason_type AS justification_type,
    j.reason_text AS justification_text,
    COALESCE(r.submitted_at, j.submitted_at) AS submitted_at
  FROM days d
  LEFT JOIN rep r ON r.report_date = d.day
  LEFT JOIN doff o ON o.off_date = d.day
  LEFT JOIN just j ON j.missed_date = d.day
  ORDER BY d.day DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_reporter_daily_timeline(uuid, date, date) TO authenticated;