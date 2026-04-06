
-- Create a function that calls the edge function when order status changes
CREATE OR REPLACE FUNCTION public.notify_order_status_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only fire when status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := (SELECT value FROM public.site_settings WHERE key = 'supabase_url' LIMIT 1) 
             || '/functions/v1/notify-order-status-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM public.site_settings WHERE key = 'service_role_key' LIMIT 1)
      ),
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

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_order_status_push ON public.orders;
CREATE TRIGGER trigger_order_status_push
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_push();
