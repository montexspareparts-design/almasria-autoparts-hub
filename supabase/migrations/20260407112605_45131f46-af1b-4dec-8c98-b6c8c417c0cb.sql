-- Trigger function to call WhatsApp on order status change
CREATE OR REPLACE FUNCTION public.notify_order_status_whatsapp()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('shipped', 'delivered', 'confirmed', 'processing') THEN
    PERFORM net.http_post(
      url := 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/functions/v1/notify-order-status-whatsapp',
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
$function$;

CREATE TRIGGER on_order_status_whatsapp
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_whatsapp();

-- Trigger function to call WhatsApp on new price list
CREATE OR REPLACE FUNCTION public.notify_pricelist_whatsapp()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_active = true THEN
    PERFORM net.http_post(
      url := 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/functions/v1/notify-pricelist-whatsapp',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'title', NEW.title
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_new_pricelist_whatsapp
  AFTER INSERT ON public.price_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pricelist_whatsapp();