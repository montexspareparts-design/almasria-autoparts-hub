
-- Trigger function to call WhatsApp edge function when new support request is created
CREATE OR REPLACE FUNCTION public.notify_admin_whatsapp_new_support_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/functions/v1/notify-admin-support-request',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'customer_name', COALESCE(NEW.customer_name, 'عميل'),
      'customer_phone', COALESCE(NEW.customer_phone, ''),
      'message', COALESCE(NEW.message, ''),
      'request_type', NEW.request_type,
      'is_dealer', COALESCE(NEW.is_dealer, false)
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_support_request_whatsapp ON public.support_requests;
CREATE TRIGGER on_new_support_request_whatsapp
AFTER INSERT ON public.support_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_whatsapp_new_support_request();
