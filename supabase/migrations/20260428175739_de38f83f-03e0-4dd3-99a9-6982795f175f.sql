-- إعادة إنشاء الـ view بـ security_invoker = true عشان يطبق RLS الخاصة بالمستخدم
DROP VIEW IF EXISTS public.staff_daily_reports_kpi;

CREATE VIEW public.staff_daily_reports_kpi
WITH (security_invoker = true) AS
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

GRANT SELECT ON public.staff_daily_reports_kpi TO authenticated;

-- منع تشغيل الدالة من المستخدم anon
REVOKE EXECUTE ON FUNCTION public.get_staff_auto_metrics(uuid, date) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_staff_auto_metrics(uuid, date) TO authenticated;