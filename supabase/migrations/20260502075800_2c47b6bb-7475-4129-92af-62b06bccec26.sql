-- جدول event log يسجل كل tick من sessionTracker بـ timestamp دقيق (للـ hourly chart)
CREATE TABLE IF NOT EXISTS public.staff_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  path text NOT NULL,
  event_at timestamptz NOT NULL DEFAULT now(),
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  hour_of_day smallint NOT NULL DEFAULT EXTRACT(HOUR FROM now())
);

CREATE INDEX IF NOT EXISTS idx_staff_activity_events_date_hour 
  ON public.staff_activity_events(event_date, hour_of_day);
CREATE INDEX IF NOT EXISTS idx_staff_activity_events_user_date 
  ON public.staff_activity_events(user_id, event_date);

ALTER TABLE public.staff_activity_events ENABLE ROW LEVEL SECURITY;

-- Admin بس يقدر يقرأ
CREATE POLICY "Admins read staff activity events"
  ON public.staff_activity_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- الموظف يقدر يدخل own events فقط (والـ trigger هيتحقق إنه فعلاً staff)
CREATE POLICY "Staff insert own activity events"
  ON public.staff_activity_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_staff(auth.uid()));

-- ============================================================
-- RPC شاملة لتقرير الإدارة: KPIs + breakdown بالساعة + per-staff
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_staff_activity_dashboard(target_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_kpis jsonb;
  v_hourly jsonb;
  v_per_staff jsonb;
BEGIN
  -- Admin only
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: Admin only';
  END IF;

  -- KPIs من staff_session_activity
  SELECT jsonb_build_object(
    'active_staff_count', COUNT(DISTINCT user_id),
    'total_page_views', COALESCE(SUM(page_views), 0),
    'total_minutes', COALESCE(SUM(EXTRACT(EPOCH FROM (last_seen_at - first_seen_at))/60)::int, 0),
    'avg_session_minutes', COALESCE(AVG(EXTRACT(EPOCH FROM (last_seen_at - first_seen_at))/60)::int, 0)
  ) INTO v_kpis
  FROM staff_session_activity
  WHERE session_date = target_date;

  -- Hourly breakdown من events (لو فاضي، نعتمد على last_seen_at fallback)
  WITH hours AS (
    SELECT generate_series(0, 23) AS hour
  ),
  events_per_hour AS (
    SELECT 
      hour_of_day AS hour,
      COUNT(*) AS event_count,
      COUNT(DISTINCT user_id) AS unique_staff
    FROM staff_activity_events
    WHERE event_date = target_date
    GROUP BY hour_of_day
  ),
  fallback_per_hour AS (
    -- Fallback: لو مفيش events، استخدم EXTRACT(HOUR) من last_seen_at للجلسات
    SELECT 
      EXTRACT(HOUR FROM last_seen_at)::int AS hour,
      SUM(page_views)::int AS event_count,
      COUNT(DISTINCT user_id) AS unique_staff
    FROM staff_session_activity
    WHERE session_date = target_date
      AND NOT EXISTS (SELECT 1 FROM staff_activity_events WHERE event_date = target_date)
    GROUP BY EXTRACT(HOUR FROM last_seen_at)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'hour', h.hour,
      'event_count', COALESCE(e.event_count, f.event_count, 0),
      'unique_staff', COALESCE(e.unique_staff, f.unique_staff, 0)
    ) ORDER BY h.hour
  ) INTO v_hourly
  FROM hours h
  LEFT JOIN events_per_hour e ON e.hour = h.hour
  LEFT JOIN fallback_per_hour f ON f.hour = h.hour;

  -- Per-staff breakdown
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', ssa.user_id,
      'name', COALESCE(p.full_name, p.email, 'موظف'),
      'role', (SELECT role::text FROM user_roles WHERE user_id = ssa.user_id ORDER BY 
        CASE role::text WHEN 'admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END LIMIT 1),
      'first_seen_at', ssa.first_seen_at,
      'last_seen_at', ssa.last_seen_at,
      'page_views', ssa.page_views,
      'duration_minutes', EXTRACT(EPOCH FROM (ssa.last_seen_at - ssa.first_seen_at))/60,
      'top_paths', (
        SELECT jsonb_agg(path_data) FROM (
          SELECT jsonb_build_object('path', p2, 'count', COUNT(*)) AS path_data
          FROM unnest(ssa.paths) AS p2
          GROUP BY p2 ORDER BY COUNT(*) DESC LIMIT 5
        ) t
      )
    ) ORDER BY ssa.last_seen_at DESC
  ) INTO v_per_staff
  FROM staff_session_activity ssa
  LEFT JOIN profiles p ON p.user_id = ssa.user_id
  WHERE ssa.session_date = target_date;

  v_result := jsonb_build_object(
    'date', target_date,
    'kpis', COALESCE(v_kpis, '{}'::jsonb),
    'hourly', COALESCE(v_hourly, '[]'::jsonb),
    'staff', COALESCE(v_per_staff, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_staff_activity_dashboard(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_activity_dashboard(date) TO authenticated;