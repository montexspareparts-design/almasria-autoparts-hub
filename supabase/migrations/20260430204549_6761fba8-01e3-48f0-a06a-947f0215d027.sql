-- Auto-notify staff when a previously-out-of-stock product becomes available
CREATE OR REPLACE FUNCTION public.auto_fulfill_shortage_on_restock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req RECORD;
  _item_label text;
  _title text;
  _msg text;
BEGIN
  -- Only react when stock transitions from 0 (or null) to a positive value
  IF COALESCE(OLD.stock_quantity, 0) > 0 OR COALESCE(NEW.stock_quantity, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  _item_label := COALESCE(NEW.name_ar, '') || ' (' || COALESCE(NEW.sku, '') || ')';

  FOR _req IN
    SELECT id, staff_user_id, requested_quantity
    FROM public.stock_shortage_requests
    WHERE product_id = NEW.id
      AND status IN ('open', 'sourcing')
  LOOP
    _title := '🎉 الصنف اللي بلّغت عنه أصبح متاح';
    _msg := 'تم توفير "' || _item_label || '" بعد المزامنة مع الفيصل.' ||
            E'\n📦 الكمية المتاحة الآن: ' || NEW.stock_quantity ||
            E'\n🔢 الكمية اللي طلبتها: ' || _req.requested_quantity;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_req.staff_user_id, _title, _msg, 'shortage_restocked');

    -- Auto-mark as fulfilled (will also fire status-change trigger but it's idempotent enough)
    UPDATE public.stock_shortage_requests
    SET status = 'fulfilled',
        admin_response = COALESCE(admin_response, 'متاح تلقائياً بعد المزامنة من الفيصل'),
        reviewed_at = COALESCE(reviewed_at, now()),
        updated_at = now()
    WHERE id = _req.id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_fulfill_shortage_on_restock ON public.products;
CREATE TRIGGER trg_auto_fulfill_shortage_on_restock
AFTER UPDATE OF stock_quantity ON public.products
FOR EACH ROW
WHEN (OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity)
EXECUTE FUNCTION public.auto_fulfill_shortage_on_restock();