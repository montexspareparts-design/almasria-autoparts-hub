-- 1) RPC: مقارنة الأرصدة بين تاريخين (يستخدم لقطات stock_snapshots + الرصيد الحالي لو to_date = اليوم)
CREATE OR REPLACE FUNCTION public.get_stock_diff_in_range(p_from date, p_to date)
RETURNS TABLE(
  product_id uuid,
  name_ar text,
  part_number text,
  sku text,
  erp_item_code text,
  brand text,
  old_qty integer,
  new_qty integer,
  delta integer,
  change_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  WITH old_snap AS (
    -- أقدم لقطة في النطاق لكل منتج
    SELECT DISTINCT ON (s.product_id) s.product_id, s.stock_quantity AS qty, s.snapshot_date
    FROM public.product_stock_snapshots s
    WHERE s.snapshot_date >= p_from AND s.snapshot_date <= p_to
    ORDER BY s.product_id, s.snapshot_date ASC
  ),
  new_snap AS (
    -- أحدث لقطة في النطاق لكل منتج
    SELECT DISTINCT ON (s.product_id) s.product_id, s.stock_quantity AS qty, s.snapshot_date
    FROM public.product_stock_snapshots s
    WHERE s.snapshot_date >= p_from AND s.snapshot_date <= p_to
    ORDER BY s.product_id, s.snapshot_date DESC
  )
  SELECT
    p.id,
    p.name_ar,
    p.part_number,
    p.sku,
    p.erp_item_code,
    p.brand::text,
    COALESCE(o.qty, 0)::int AS old_qty,
    -- لو النطاق ينتهي اليوم، استخدم الرصيد الحالي بدل آخر لقطة
    CASE WHEN p_to >= CURRENT_DATE THEN COALESCE(p.stock_quantity, 0) ELSE COALESCE(n.qty, 0) END::int AS new_qty,
    (CASE WHEN p_to >= CURRENT_DATE THEN COALESCE(p.stock_quantity, 0) ELSE COALESCE(n.qty, 0) END
       - COALESCE(o.qty, 0))::int AS delta,
    CASE
      WHEN COALESCE(o.qty, 0) = 0 THEN NULL
      ELSE ROUND(
        ((CASE WHEN p_to >= CURRENT_DATE THEN COALESCE(p.stock_quantity, 0) ELSE COALESCE(n.qty, 0) END
          - o.qty)::numeric / NULLIF(o.qty, 0)::numeric) * 100, 2)
    END AS change_pct
  FROM public.products p
  LEFT JOIN old_snap o ON o.product_id = p.id
  LEFT JOIN new_snap n ON n.product_id = p.id
  WHERE (o.product_id IS NOT NULL OR n.product_id IS NOT NULL)
    AND (
      COALESCE(o.qty, 0) <>
      CASE WHEN p_to >= CURRENT_DATE THEN COALESCE(p.stock_quantity, 0) ELSE COALESCE(n.qty, 0) END
    );
END;
$$;

-- 2) Trigger: تسجيل أي تغيير في base_price داخل price_change_history
CREATE OR REPLACE FUNCTION public.log_product_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.base_price IS DISTINCT FROM OLD.base_price
     AND OLD.base_price IS NOT NULL
     AND NEW.base_price IS NOT NULL
     AND OLD.base_price > 0 THEN
    INSERT INTO public.price_change_history (
      product_id, old_price, new_price, change_percentage, source
    ) VALUES (
      NEW.id,
      OLD.base_price,
      NEW.base_price,
      ROUND(((NEW.base_price - OLD.base_price) / OLD.base_price) * 100, 2),
      'system'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_product_price_change ON public.products;
CREATE TRIGGER trg_log_product_price_change
AFTER UPDATE OF base_price ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.log_product_price_change();