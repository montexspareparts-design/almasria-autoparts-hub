ALTER TABLE public.reporter_daily_reports
ADD COLUMN IF NOT EXISTS quotations_count integer NOT NULL DEFAULT 0;