-- Daily staff reports table
CREATE TABLE public.staff_daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL,
  staff_name TEXT,
  staff_email TEXT,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Manual numeric inputs
  customers_contacted INTEGER NOT NULL DEFAULT 0,
  customers_registered INTEGER NOT NULL DEFAULT 0,
  customers_with_invoices INTEGER NOT NULL DEFAULT 0,
  total_invoices_amount NUMERIC NOT NULL DEFAULT 0,
  hot_leads_count INTEGER NOT NULL DEFAULT 0,
  follow_ups_done INTEGER NOT NULL DEFAULT 0,
  problems_faced TEXT,
  best_deal_today TEXT,
  tomorrow_plan TEXT,
  general_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (staff_user_id, report_date)
);

ALTER TABLE public.staff_daily_reports ENABLE ROW LEVEL SECURITY;

-- Staff: insert own report
CREATE POLICY "Staff insert own daily report"
ON public.staff_daily_reports
FOR INSERT
TO authenticated
WITH CHECK (is_staff(auth.uid()) AND staff_user_id = auth.uid());

-- Staff: update own report (today only)
CREATE POLICY "Staff update own daily report"
ON public.staff_daily_reports
FOR UPDATE
TO authenticated
USING (staff_user_id = auth.uid() AND report_date = CURRENT_DATE)
WITH CHECK (staff_user_id = auth.uid());

-- Staff: view own reports
CREATE POLICY "Staff view own daily reports"
ON public.staff_daily_reports
FOR SELECT
TO authenticated
USING (staff_user_id = auth.uid());

-- Admins: full access
CREATE POLICY "Admins manage daily reports"
ON public.staff_daily_reports
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_staff_daily_reports_updated_at
BEFORE UPDATE ON public.staff_daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Notify admins when a new report is submitted
CREATE OR REPLACE FUNCTION public.notify_admins_daily_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id UUID;
  staff_label TEXT;
BEGIN
  staff_label := COALESCE(NEW.staff_name, NEW.staff_email, 'موظف');
  FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      admin_id,
      '📋 تقرير يومي جديد',
      staff_label || ' قدّم تقريره اليومي — ' || NEW.customers_contacted::text || ' عميل تم التواصل معاهم، ' || NEW.customers_with_invoices::text || ' فاتورة',
      'info'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_daily_report
AFTER INSERT ON public.staff_daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_daily_report();

CREATE INDEX idx_staff_daily_reports_date ON public.staff_daily_reports (report_date DESC);
CREATE INDEX idx_staff_daily_reports_staff ON public.staff_daily_reports (staff_user_id, report_date DESC);