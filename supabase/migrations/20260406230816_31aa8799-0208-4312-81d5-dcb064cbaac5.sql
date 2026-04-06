
CREATE OR REPLACE FUNCTION public.notify_order_status_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/functions/v1/notify-order-status-push',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'order_id', NEW.id,
        'new_status', NEW.status,
        'order_number', NEW.order_number,
        'user_id', NEW.user_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;
