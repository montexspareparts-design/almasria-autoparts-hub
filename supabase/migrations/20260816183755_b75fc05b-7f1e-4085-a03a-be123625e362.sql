select cron.schedule(
  'erp-push-pending-orders-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/functions/v1/erp-push-pending-orders',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcGZqaGNmaGZqcXVzYmpua2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDQyOTcsImV4cCI6MjA4ODM4MDI5N30.RYmXJnGcRW-KAAvOwu4x0PQINq0Tws6y3I7F91ZMbEc"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);