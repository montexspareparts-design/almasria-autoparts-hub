-- Dedupe table to avoid spamming admins for the same failure
CREATE TABLE IF NOT EXISTS public.erp_sync_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key TEXT NOT NULL UNIQUE,
  alert_type TEXT NOT NULL,
  sync_type TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  notified_admins INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_erp_sync_alerts_created ON public.erp_sync_alerts(created_at DESC);

ALTER TABLE public.erp_sync_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ERP sync alerts"
ON public.erp_sync_alerts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Schedule monitor every 15 minutes
SELECT cron.schedule(
  'monitor-erp-sync-failures',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/functions/v1/monitor-erp-sync-failures',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);