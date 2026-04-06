
-- Fix search path security warning
CREATE OR REPLACE FUNCTION public.notify_order_status_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supabase_url text;
  _service_key text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT value INTO _supabase_url FROM public.site_settings WHERE key = 'supabase_url' LIMIT 1;
    SELECT value INTO _service_key FROM public.site_settings WHERE key = 'service_role_key' LIMIT 1;
    
    IF _supabase_url IS NOT NULL AND _service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := _supabase_url || '/functions/v1/notify-order-status-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || _service_key
        ),
        body := jsonb_build_object(
          'order_id', NEW.id,
          'new_status', NEW.status,
          'order_number', NEW.order_number,
          'user_id', NEW.user_id
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Insert site_settings for supabase_url (upsert)
INSERT INTO public.site_settings (key, value)
VALUES ('supabase_url', 'https://hcpfjhcfhfjqusbjnkfa.supabase.co')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
