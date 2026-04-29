-- Add snapshot columns for system-pulled stats and an admin notification trigger
ALTER TABLE public.reporter_daily_reports
  ADD COLUMN IF NOT EXISTS auto_orders_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_invoices_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_total_sales numeric NOT NULL DEFAULT 0;

-- Helpful indexes for date-range queries
CREATE INDEX IF NOT EXISTS idx_reporter_reports_user_date
  ON public.reporter_daily_reports(user_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_reporter_reports_submitted
  ON public.reporter_daily_reports(submitted_at DESC) WHERE is_submitted = true;

-- Trigger: when a report is submitted -> notify admins (in-site push) + call WhatsApp edge function
CREATE OR REPLACE FUNCTION public.notify_on_reporter_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_id uuid;
  staff_label text;
BEGIN
  IF NEW.is_submitted = true AND (OLD.is_submitted IS DISTINCT FROM true) THEN
    SELECT COALESCE(p.full_name, p.email, 'موظف الفيصل') INTO staff_label
    FROM public.profiles p WHERE p.user_id = NEW.user_id LIMIT 1;

    -- Notify all admins inside the app
    FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        admin_id,
        '📋 تقرير الفيصل اليومي',
        COALESCE(staff_label, 'موظف') || ' سلّم تقرير ' || to_char(NEW.report_date, 'YYYY-MM-DD') ||
        ' — عروض: ' || NEW.quotations_count || ' / مكالمات: ' || NEW.calls_count ||
        ' / محولة: ' || NEW.offers_converted_count,
        'reporter_report'
      );
    END LOOP;

    -- Fire WhatsApp delivery (edge function will format + send to 01020412358)
    PERFORM net.http_post(
      url := 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/functions/v1/notify-reporter-report-whatsapp',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('report_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_reporter_submit ON public.reporter_daily_reports;
CREATE TRIGGER trg_notify_on_reporter_submit
  AFTER UPDATE ON public.reporter_daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reporter_submit();

DROP TRIGGER IF EXISTS trg_notify_on_reporter_submit_ins ON public.reporter_daily_reports;
CREATE TRIGGER trg_notify_on_reporter_submit_ins
  AFTER INSERT ON public.reporter_daily_reports
  FOR EACH ROW WHEN (NEW.is_submitted = true)
  EXECUTE FUNCTION public.notify_on_reporter_submit();

-- Allow admins to SELECT all reporter reports (for admin dashboard / leaderboard)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reporter_daily_reports'
      AND policyname = 'Admins can view all reporter reports'
  ) THEN
    CREATE POLICY "Admins can view all reporter reports"
      ON public.reporter_daily_reports
      FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Aggregate function: per-staff totals over a date range (admin uses this)
CREATE OR REPLACE FUNCTION public.get_reporter_aggregate(
  _user_id uuid,
  _from date,
  _to date
)
RETURNS TABLE(
  reports_count integer,
  quotations_count bigint,
  calls_count bigint,
  whatsapp_count bigint,
  offers_sent_count bigint,
  offers_converted_count bigint,
  incomplete_orders_count bigint,
  followups_count bigint,
  new_customers_count bigint,
  lost_opportunities_count bigint,
  auto_orders_count bigint,
  auto_invoices_count bigint,
  auto_total_sales numeric,
  performance_score numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COUNT(*)::int AS reports_count,
    COALESCE(SUM(quotations_count), 0),
    COALESCE(SUM(calls_count), 0),
    COALESCE(SUM(whatsapp_count), 0),
    COALESCE(SUM(offers_sent_count), 0),
    COALESCE(SUM(offers_converted_count), 0),
    COALESCE(SUM(incomplete_orders_count), 0),
    COALESCE(SUM(followups_count), 0),
    COALESCE(SUM(new_customers_count), 0),
    COALESCE(SUM(lost_opportunities_count), 0),
    COALESCE(SUM(auto_orders_count), 0),
    COALESCE(SUM(auto_invoices_count), 0),
    COALESCE(SUM(auto_total_sales), 0)::numeric,
    -- Composite score: converted×3 + new_customers×2 + calls + followups - incomplete
    (COALESCE(SUM(offers_converted_count), 0) * 3
     + COALESCE(SUM(new_customers_count), 0) * 2
     + COALESCE(SUM(calls_count), 0)
     + COALESCE(SUM(followups_count), 0)
     - COALESCE(SUM(incomplete_orders_count), 0))::numeric AS performance_score
  FROM public.reporter_daily_reports
  WHERE user_id = _user_id
    AND report_date BETWEEN _from AND _to
    AND is_submitted = true;
$$;

-- Leaderboard function: rank all reporters by composite score in a date range
CREATE OR REPLACE FUNCTION public.get_reporter_leaderboard(
  _from date,
  _to date
)
RETURNS TABLE(
  user_id uuid,
  staff_name text,
  staff_email text,
  reports_count integer,
  quotations_total bigint,
  calls_total bigint,
  converted_total bigint,
  new_customers_total bigint,
  performance_score numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    r.user_id,
    COALESCE(p.full_name, p.email, 'موظف') AS staff_name,
    p.email AS staff_email,
    COUNT(*)::int AS reports_count,
    COALESCE(SUM(r.quotations_count), 0) AS quotations_total,
    COALESCE(SUM(r.calls_count), 0) AS calls_total,
    COALESCE(SUM(r.offers_converted_count), 0) AS converted_total,
    COALESCE(SUM(r.new_customers_count), 0) AS new_customers_total,
    (COALESCE(SUM(r.offers_converted_count), 0) * 3
     + COALESCE(SUM(r.new_customers_count), 0) * 2
     + COALESCE(SUM(r.calls_count), 0)
     + COALESCE(SUM(r.followups_count), 0)
     - COALESCE(SUM(r.incomplete_orders_count), 0))::numeric AS performance_score
  FROM public.reporter_daily_reports r
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  WHERE r.report_date BETWEEN _from AND _to
    AND r.is_submitted = true
  GROUP BY r.user_id, p.full_name, p.email
  ORDER BY performance_score DESC;
$$;