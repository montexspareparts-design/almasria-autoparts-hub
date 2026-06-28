
-- =====================================================
-- 1. LOYALTY PROGRAM
-- =====================================================
CREATE TABLE public.loyalty_points (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  lifetime_earned integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'bronze',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.loyalty_points TO authenticated;
GRANT ALL ON public.loyalty_points TO service_role;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own points" ON public.loyalty_points FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manages points" ON public.loyalty_points FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL,
  type text NOT NULL CHECK (type IN ('earn','redeem','adjust','expire')),
  reason text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.loyalty_transactions TO authenticated;
GRANT ALL ON public.loyalty_transactions TO service_role;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own loyalty tx" ON public.loyalty_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admin inserts loyalty tx" ON public.loyalty_transactions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX idx_loyalty_tx_user ON public.loyalty_transactions(user_id, created_at DESC);

-- Auto-award points on order delivery
CREATE OR REPLACE FUNCTION public.award_loyalty_on_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pts integer;
  new_balance integer;
  new_lifetime integer;
  new_tier text;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    pts := FLOOR(COALESCE(NEW.total_amount,0))::integer;
    IF pts <= 0 THEN RETURN NEW; END IF;
    -- Prevent double award
    IF EXISTS (SELECT 1 FROM public.loyalty_transactions WHERE order_id = NEW.id AND type = 'earn') THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.loyalty_points(user_id, balance, lifetime_earned)
      VALUES (NEW.user_id, pts, pts)
      ON CONFLICT (user_id) DO UPDATE
        SET balance = loyalty_points.balance + EXCLUDED.balance,
            lifetime_earned = loyalty_points.lifetime_earned + EXCLUDED.lifetime_earned,
            updated_at = now()
      RETURNING balance, lifetime_earned INTO new_balance, new_lifetime;

    new_tier := CASE
      WHEN new_lifetime >= 50000 THEN 'platinum'
      WHEN new_lifetime >= 20000 THEN 'gold'
      WHEN new_lifetime >= 5000 THEN 'silver'
      ELSE 'bronze' END;
    UPDATE public.loyalty_points SET tier = new_tier WHERE user_id = NEW.user_id;

    INSERT INTO public.loyalty_transactions(user_id, points, type, reason, order_id)
      VALUES (NEW.user_id, pts, 'earn', 'تسليم الطلب ' || COALESCE(NEW.order_number, NEW.id::text), NEW.id);

    INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (NEW.user_id, '🎉 كسبت ' || pts || ' نقطة', 'تم إضافة ' || pts || ' نقطة لرصيدك من الطلب ' || COALESCE(NEW.order_number,''), 'loyalty_earned', '/my-profile?tab=loyalty');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_award_loyalty AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.award_loyalty_on_delivery();

-- =====================================================
-- 2. PRICE DROP ALERTS
-- =====================================================
CREATE TABLE public.price_drop_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reference_price numeric(12,2) NOT NULL,
  last_notified_price numeric(12,2),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_drop_alerts TO authenticated;
GRANT ALL ON public.price_drop_alerts TO service_role;
ALTER TABLE public.price_drop_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own price alerts" ON public.price_drop_alerts FOR ALL TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_price_alerts_product ON public.price_drop_alerts(product_id) WHERE active = true;

-- Trigger: notify on price drop
CREATE OR REPLACE FUNCTION public.notify_price_drop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NEW.base_price < OLD.base_price AND NEW.base_price > 0 THEN
    FOR r IN
      SELECT pda.id, pda.user_id, pda.reference_price
      FROM public.price_drop_alerts pda
      WHERE pda.product_id = NEW.id
        AND pda.active = true
        AND NEW.base_price < pda.reference_price
        AND (pda.last_notified_price IS NULL OR NEW.base_price < pda.last_notified_price)
    LOOP
      INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (
        r.user_id,
        '📉 انخفض سعر منتج تتابعه',
        NEW.name_ar || ' — السعر الجديد ' || NEW.base_price || ' جنيه (كان ' || r.reference_price || ')',
        'price_drop',
        '/products?search=' || NEW.sku
      );
      UPDATE public.price_drop_alerts SET last_notified_price = NEW.base_price WHERE id = r.id;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_price_drop AFTER UPDATE OF base_price ON public.products
  FOR EACH ROW WHEN (OLD.base_price IS DISTINCT FROM NEW.base_price)
  EXECUTE FUNCTION public.notify_price_drop();

-- =====================================================
-- 3. DEALER BULK UPLOAD LOG
-- =====================================================
CREATE TABLE public.dealer_bulk_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text,
  total_rows integer NOT NULL DEFAULT 0,
  matched_count integer NOT NULL DEFAULT 0,
  added_to_cart integer NOT NULL DEFAULT 0,
  unmatched_skus jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.dealer_bulk_uploads TO authenticated;
GRANT ALL ON public.dealer_bulk_uploads TO service_role;
ALTER TABLE public.dealer_bulk_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dealers view own bulk uploads" ON public.dealer_bulk_uploads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Dealers insert own bulk uploads" ON public.dealer_bulk_uploads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
