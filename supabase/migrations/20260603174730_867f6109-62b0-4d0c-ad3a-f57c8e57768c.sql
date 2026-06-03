CREATE TABLE public.reporter_schedule_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  dispatch_date DATE NOT NULL,
  dispatch_hour SMALLINT NOT NULL,
  trigger_source TEXT NOT NULL DEFAULT 'cron',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_name, dispatch_date)
);
GRANT SELECT ON public.reporter_schedule_dispatches TO authenticated;
GRANT ALL ON public.reporter_schedule_dispatches TO service_role;
ALTER TABLE public.reporter_schedule_dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view reporter schedule dispatches"
ON public.reporter_schedule_dispatches
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname IN (
      'reporter-daily-reminder-5pm',
      'reporter-reports-batch-6pm-cairo',
      'notify-missing-daily-reports-9pm-cairo'
    );

    PERFORM cron.schedule(
      'reporter-daily-reminder-5pm',
      '*/15 * * * *',
      $cron$
      SELECT net.http_post(
        url:='https://hcpfjhcfhfjqusbjnkfa.supabase.co/functions/v1/reporter-daily-reminder',
        headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcGZqaGNmaGZqcXVzYmpua2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDQyOTcsImV4cCI6MjA4ODM4MDI5N30.RYmXJnGcRW-KAAvOwu4x0PQINq0Tws6y3I7F91ZMbEc"}'::jsonb,
        body:='{"trigger":"cron","schedule":"reporter-daily-reminder"}'::jsonb,
        timeout_milliseconds:=60000
      );
      $cron$
    );

    PERFORM cron.schedule(
      'reporter-reports-batch-6pm-cairo',
      '*/15 * * * *',
      $cron$
      SELECT net.http_post(
        url:='https://hcpfjhcfhfjqusbjnkfa.supabase.co/functions/v1/send-reporter-reports-batch',
        headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcGZqaGNmaGZqcXVzYmpua2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDQyOTcsImV4cCI6MjA4ODM4MDI5N30.RYmXJnGcRW-KAAvOwu4x0PQINq0Tws6y3I7F91ZMbEc"}'::jsonb,
        body:='{"trigger":"cron","schedule":"send-reporter-reports-batch"}'::jsonb,
        timeout_milliseconds:=60000
      );
      $cron$
    );

    PERFORM cron.schedule(
      'notify-missing-daily-reports-9pm-cairo',
      '*/15 * * * *',
      $cron$
      SELECT net.http_post(
        url:='https://hcpfjhcfhfjqusbjnkfa.supabase.co/functions/v1/notify-missing-daily-reports',
        headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcGZqaGNmaGZqcXVzYmpua2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDQyOTcsImV4cCI6MjA4ODM4MDI5N30.RYmXJnGcRW-KAAvOwu4x0PQINq0Tws6y3I7F91ZMbEc"}'::jsonb,
        body:='{"trigger":"cron","schedule":"notify-missing-daily-reports"}'::jsonb,
        timeout_milliseconds:=60000
      );
      $cron$
    );
  END IF;
END
$outer$;