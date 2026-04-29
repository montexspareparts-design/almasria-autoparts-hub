CREATE TABLE IF NOT EXISTS public.reporter_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  -- Section 2: التواصل
  calls_count integer NOT NULL DEFAULT 0,
  whatsapp_count integer NOT NULL DEFAULT 0,
  offers_sent_count integer NOT NULL DEFAULT 0,
  -- Section 3: التحويل
  offers_count integer NOT NULL DEFAULT 0,
  offers_converted_count integer NOT NULL DEFAULT 0,
  incomplete_orders_count integer NOT NULL DEFAULT 0,
  -- Section 4: المتابعة والنمو
  followups_count integer NOT NULL DEFAULT 0,
  new_customers_count integer NOT NULL DEFAULT 0,
  -- Section 5: المشاكل
  main_problem text,
  problem_notes text,
  -- Section 6: الفرص الضايعة
  lost_opportunities_count integer NOT NULL DEFAULT 0,
  -- Lock
  is_submitted boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_date)
);

ALTER TABLE public.reporter_daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage own reporter reports"
ON public.reporter_daily_reports
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND is_staff(auth.uid()));

CREATE POLICY "Admins view all reporter reports"
ON public.reporter_daily_reports
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.lock_submitted_reporter_report()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_submitted = true AND NEW.is_submitted = true THEN
    -- Once submitted, prevent any field changes (admin can still update via service role)
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'لا يمكن تعديل التقرير بعد الإرسال';
    END IF;
  END IF;
  NEW.updated_at = now();
  IF NEW.is_submitted = true AND OLD.is_submitted = false THEN
    NEW.submitted_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_reporter_report ON public.reporter_daily_reports;
CREATE TRIGGER trg_lock_reporter_report
BEFORE UPDATE ON public.reporter_daily_reports
FOR EACH ROW EXECUTE FUNCTION public.lock_submitted_reporter_report();