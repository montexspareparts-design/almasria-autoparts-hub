
DROP FUNCTION IF EXISTS public.get_today_erp_restocked_items();

CREATE OR REPLACE FUNCTION public.get_today_erp_restocked_items()
 RETURNS TABLE(erp_id text, name text, part_number text, prev_qty integer, current_qty integer, delta integer, was_zero boolean, is_new boolean, retail_price numeric, wholesale_price numeric, in_our_system boolean, our_product_id uuid, had_shortage_request boolean, shortage_requests_count integer, baseline_at timestamp with time zone, minutes_since_baseline integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_batch uuid;
  v_at timestamptz;
BEGIN
  IF NOT is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT b.batch_id, b.snapshot_at INTO v_batch, v_at
  FROM public.erp_intraday_baselines b
  WHERE b.snapshot_at >= date_trunc('day', now() AT TIME ZONE 'Africa/Cairo') AT TIME ZONE 'Africa/Cairo'
  ORDER BY b.snapshot_at ASC
  LIMIT 1;

  IF v_batch IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT b.erp_id, b.name, b.qty
    FROM public.erp_intraday_baselines b
    WHERE b.batch_id = v_batch
  ),
  curr AS (
    SELECT e.erp_id, e.name, e.qty, e.retail_price, e.wholesale_price, e.part_number
    FROM public.erp_full_catalog_cache e
  ),
  joined AS (
    SELECT
      c.erp_id,
      c.name,
      c.part_number,
      COALESCE(b.qty, 0) AS prev_qty,
      c.qty AS current_qty,
      c.qty - COALESCE(b.qty, 0) AS delta,
      (COALESCE(b.qty, 0) = 0 AND c.qty > 0) AS was_zero,
      (b.erp_id IS NULL) AS is_new,
      c.retail_price,
      c.wholesale_price
    FROM curr c
    LEFT JOIN base b ON b.erp_id = c.erp_id
    WHERE c.qty - COALESCE(b.qty, 0) > 0
      AND c.qty > 0
  ),
  shortages AS (
    SELECT manual_sku, COUNT(*)::int AS cnt
    FROM public.stock_shortage_requests
    WHERE status IN ('pending', 'in_progress')
      AND manual_sku IS NOT NULL
    GROUP BY manual_sku
  )
  SELECT
    j.erp_id,
    j.name,
    COALESCE(j.part_number, p.part_number) AS part_number,
    j.prev_qty,
    j.current_qty,
    j.delta,
    j.was_zero,
    j.is_new,
    j.retail_price,
    j.wholesale_price,
    (p.id IS NOT NULL) AS in_our_system,
    p.id AS our_product_id,
    (s.cnt IS NOT NULL AND s.cnt > 0) AS had_shortage_request,
    COALESCE(s.cnt, 0) AS shortage_requests_count,
    v_at AS baseline_at,
    GREATEST(0, EXTRACT(EPOCH FROM (now() - v_at))::int / 60) AS minutes_since_baseline
  FROM joined j
  LEFT JOIN public.products p ON p.sku = j.erp_id
  LEFT JOIN shortages s ON s.manual_sku = j.erp_id
  ORDER BY
    (s.cnt IS NOT NULL AND s.cnt > 0) DESC,
    j.delta DESC,
    j.current_qty DESC;
END;
$function$;
