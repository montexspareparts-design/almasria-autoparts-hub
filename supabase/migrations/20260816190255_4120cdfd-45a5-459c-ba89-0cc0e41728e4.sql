CREATE OR REPLACE FUNCTION public.notify_warehouse_paid_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'processing' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'processing') THEN
    PERFORM net.http_post(
      url := 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/functions/v1/notify-warehouse-order',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('order_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_warehouse_paid_order_ins ON public.orders;
CREATE TRIGGER trg_notify_warehouse_paid_order_ins
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_warehouse_paid_order();

DROP TRIGGER IF EXISTS trg_notify_warehouse_paid_order_upd ON public.orders;
CREATE TRIGGER trg_notify_warehouse_paid_order_upd
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_warehouse_paid_order();