DROP FUNCTION IF EXISTS public.get_restocked_items(integer);

CREATE OR REPLACE FUNCTION public.get_restocked_items(_days_back integer DEFAULT 1)
 RETURNS TABLE(
   product_id uuid,
   sku text,
   name_ar text,
   brand text,
   prev_stock integer,
   current_stock integer,
   delta integer,
   was_zero boolean,
   had_shortage_request boolean,
   shortage_requests_count bigint,
   base_price numeric,
   baseline_date date,
   last_zero_date date,
   days_since_zero integer
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH today_snap AS (
    SELECT product_id, stock_quantity
    FROM public.product_stock_snapshots
    WHERE snapshot_date = CURRENT_DATE
  ),
  prev_snap AS (
    SELECT DISTINCT ON (product_id)
      product_id,
      stock_quantity,
      snapshot_date
    FROM public.product_stock_snapshots
    WHERE snapshot_date >= CURRENT_DATE - _days_back
      AND snapshot_date < CURRENT_DATE
    ORDER BY product_id, snapshot_date ASC
  ),
  -- آخر يوم سُجل فيه الصنف كصفر قبل النهاردة
  last_zero AS (
    SELECT product_id, MAX(snapshot_date) AS last_zero_date
    FROM public.product_stock_snapshots
    WHERE stock_quantity = 0
      AND snapshot_date < CURRENT_DATE
    GROUP BY product_id
  ),
  shortages AS (
    SELECT product_id, COUNT(*) AS cnt
    FROM public.stock_shortage_requests
    WHERE product_id IS NOT NULL
      AND created_at > NOW() - INTERVAL '60 days'
    GROUP BY product_id
  )
  SELECT
    p.id AS product_id,
    p.sku,
    p.name_ar,
    p.brand,
    COALESCE(ps.stock_quantity, 0) AS prev_stock,
    COALESCE(ts.stock_quantity, 0) AS current_stock,
    (COALESCE(ts.stock_quantity, 0) - COALESCE(ps.stock_quantity, 0)) AS delta,
    (COALESCE(ps.stock_quantity, 0) = 0) AS was_zero,
    (sh.cnt IS NOT NULL) AS had_shortage_request,
    COALESCE(sh.cnt, 0) AS shortage_requests_count,
    p.base_price,
    ps.snapshot_date AS baseline_date,
    lz.last_zero_date,
    CASE
      WHEN lz.last_zero_date IS NOT NULL
        THEN (CURRENT_DATE - lz.last_zero_date)::integer
      ELSE NULL
    END AS days_since_zero
  FROM public.products p
  INNER JOIN today_snap ts ON ts.product_id = p.id
  LEFT JOIN prev_snap ps ON ps.product_id = p.id
  LEFT JOIN last_zero lz ON lz.product_id = p.id
  LEFT JOIN shortages sh ON sh.product_id = p.id
  WHERE p.is_active = true
    AND is_staff(auth.uid())
    AND COALESCE(ts.stock_quantity, 0) > COALESCE(ps.stock_quantity, 0)
  ORDER BY
    (sh.cnt IS NOT NULL) DESC,
    (COALESCE(ts.stock_quantity, 0) - COALESCE(ps.stock_quantity, 0)) DESC;
$function$;