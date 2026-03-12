-- Stock alerts table: dealers subscribe to product notifications
CREATE TABLE public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'back_in_stock', -- 'back_in_stock', 'price_drop', 'offer'
  is_active BOOLEAN NOT NULL DEFAULT true,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id, alert_type)
);

ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

-- Dealers can manage their own alerts
CREATE POLICY "Dealers can view own alerts"
  ON public.stock_alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Dealers can create alerts"
  ON public.stock_alerts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Dealers can delete own alerts"
  ON public.stock_alerts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Dealers can update own alerts"
  ON public.stock_alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all alerts"
  ON public.stock_alerts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: when stock_quantity changes from 0 to >0, notify subscribers
CREATE OR REPLACE FUNCTION public.notify_stock_back()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when stock goes from 0 to positive
  IF OLD.stock_quantity <= 0 AND NEW.stock_quantity > 0 THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT 
      sa.user_id,
      '🔔 المنتج متوفر الآن!',
      'المنتج "' || NEW.name_ar || '" (رقم القطعة: ' || NEW.sku || ') أصبح متوفراً. اطلبه الآن قبل نفاد الكمية!',
      'stock_alert'
    FROM public.stock_alerts sa
    WHERE sa.product_id = NEW.id
      AND sa.is_active = true
      AND sa.alert_type = 'back_in_stock';

    -- Mark alerts as notified
    UPDATE public.stock_alerts
    SET notified_at = now(), is_active = false
    WHERE product_id = NEW.id
      AND alert_type = 'back_in_stock'
      AND is_active = true;
  END IF;

  -- Price drop notification
  IF NEW.is_on_sale = true AND OLD.is_on_sale = false THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT 
      sa.user_id,
      '🏷️ عرض خاص على منتج تتابعه!',
      'المنتج "' || NEW.name_ar || '" عليه عرض خاص الآن! اطلبه قبل انتهاء العرض.',
      'stock_alert'
    FROM public.stock_alerts sa
    WHERE sa.product_id = NEW.id
      AND sa.is_active = true
      AND sa.alert_type IN ('price_drop', 'offer');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_stock_back
  AFTER UPDATE OF stock_quantity, is_on_sale ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_stock_back();
