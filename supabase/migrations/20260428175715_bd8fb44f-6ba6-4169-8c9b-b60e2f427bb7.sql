-- 1) أضف الحقول الجديدة لجدول التقارير اليومية
ALTER TABLE public.staff_daily_reports
  ADD COLUMN IF NOT EXISTS follow_ups_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quotes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lost_customers_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS performance_rating integer,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone;

-- 2) Constraints للقيم
DO $$ BEGIN
  ALTER TABLE public.staff_daily_reports
    ADD CONSTRAINT staff_daily_reports_lost_reason_chk
    CHECK (lost_reason IS NULL OR lost_reason IN ('price','out_of_stock','delay','no_response','other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.staff_daily_reports
    ADD CONSTRAINT staff_daily_reports_rating_chk
    CHECK (performance_rating IS NULL OR (performance_rating BETWEEN 1 AND 10));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.staff_daily_reports
    ADD CONSTRAINT staff_daily_reports_nonneg_chk
    CHECK (
      customers_contacted >= 0 AND customers_registered >= 0 AND customers_with_invoices >= 0
      AND total_invoices_amount >= 0 AND hot_leads_count >= 0 AND follow_ups_done >= 0
      AND follow_ups_count >= 0 AND quotes_count >= 0 AND lost_customers_count >= 0
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) عدّل سياسة التحديث: الموظف يقدر يعدل فقط لو التقرير مش مقفول ومن نفس اليوم
DROP POLICY IF EXISTS "Staff update own daily report" ON public.staff_daily_reports;
CREATE POLICY "Staff update own daily report"
ON public.staff_daily_reports
FOR UPDATE
TO authenticated
USING (
  staff_user_id = auth.uid()
  AND report_date = CURRENT_DATE
  AND is_locked = false
)
WITH CHECK (
  staff_user_id = auth.uid()
);

-- 4) Trigger: لما الموظف يقفل التقرير (is_locked=true) سجّل وقت القفل
CREATE OR REPLACE FUNCTION public.set_daily_report_locked_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_locked = true AND (OLD.is_locked IS DISTINCT FROM true) THEN
    NEW.locked_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_daily_report_locked_at ON public.staff_daily_reports;
CREATE TRIGGER trg_set_daily_report_locked_at
BEFORE UPDATE ON public.staff_daily_reports
FOR EACH ROW EXECUTE FUNCTION public.set_daily_report_locked_at();

-- 5) Trigger: لو الإدراج الأولي بـ is_locked=true سجّل locked_at
CREATE OR REPLACE FUNCTION public.set_daily_report_locked_at_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_locked = true AND NEW.locked_at IS NULL THEN
    NEW.locked_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_daily_report_locked_at_ins ON public.staff_daily_reports;
CREATE TRIGGER trg_set_daily_report_locked_at_ins
BEFORE INSERT ON public.staff_daily_reports
FOR EACH ROW EXECUTE FUNCTION public.set_daily_report_locked_at_insert();

-- 6) Function لجلب البيانات التلقائية (Leads/Orders/Sales) لموظف في يوم معين
-- تُستخدم في الواجهة لعرض الأرقام التلقائية بجوار الأرقام اليدوية
CREATE OR REPLACE FUNCTION public.get_staff_auto_metrics(_staff_user_id uuid, _date date)
RETURNS TABLE (
  leads_count integer,
  orders_count integer,
  total_sales numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Leads أنشأهم/تابعهم الموظف (created_by)
    COALESCE((SELECT COUNT(*)::int FROM public.leads
              WHERE created_by = _staff_user_id
                AND created_at::date = _date), 0) AS leads_count,
    -- Orders اللي حصلت في اليوم (إجمالي الطلبات في السيستم)
    COALESCE((SELECT COUNT(*)::int FROM public.orders
              WHERE created_at::date = _date
                AND status NOT IN ('cancelled')), 0) AS orders_count,
    -- إجمالي مبيعات اليوم
    COALESCE((SELECT SUM(total_amount) FROM public.orders
              WHERE created_at::date = _date
                AND status NOT IN ('cancelled')), 0)::numeric AS total_sales;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_auto_metrics(uuid, date) TO authenticated;

-- 7) View للإدارة: ملخص يومي بكل المؤشرات المحسوبة
CREATE OR REPLACE VIEW public.staff_daily_reports_kpi AS
SELECT
  r.id,
  r.staff_user_id,
  r.staff_name,
  r.staff_email,
  r.report_date,
  r.customers_contacted,
  r.customers_registered,
  r.customers_with_invoices,
  r.total_invoices_amount,
  r.hot_leads_count,
  r.follow_ups_count,
  r.quotes_count,
  r.lost_customers_count,
  r.lost_reason,
  r.performance_rating,
  r.problems_faced,
  r.best_deal_today,
  r.tomorrow_plan,
  r.general_notes,
  r.is_locked,
  r.locked_at,
  r.submitted_at,
  -- KPIs محسوبة (مع تجنب القسمة على صفر)
  CASE WHEN r.customers_contacted > 0
       THEN ROUND((r.customers_with_invoices::numeric / r.customers_contacted::numeric) * 100, 1)
       ELSE 0 END AS conversion_rate_pct,
  CASE WHEN r.hot_leads_count > 0
       THEN ROUND((r.customers_with_invoices::numeric / r.hot_leads_count::numeric) * 100, 1)
       ELSE 0 END AS leads_to_orders_pct,
  CASE WHEN r.customers_with_invoices > 0
       THEN ROUND(r.total_invoices_amount / r.customers_with_invoices::numeric, 2)
       ELSE 0 END AS avg_order_value,
  (r.customers_contacted + r.follow_ups_count) AS activity_score
FROM public.staff_daily_reports r;

-- View يرث RLS من الجدول الأصلي. الـ Admin يقدر يقرأ كل التقارير.
GRANT SELECT ON public.staff_daily_reports_kpi TO authenticated;

-- 8) Index لتسريع استعلامات الإدارة
CREATE INDEX IF NOT EXISTS idx_staff_daily_reports_date_locked
  ON public.staff_daily_reports (report_date DESC, is_locked);