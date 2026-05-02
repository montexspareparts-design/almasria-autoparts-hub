CREATE OR REPLACE FUNCTION public.get_today_new_in_erp()
RETURNS TABLE(
  erp_id text,
  name text,
  qty integer,
  retail_price numeric,
  wholesale_price numeric,
  fetched_at timestamp with time zone,
  in_our_system boolean,
  is_inactive boolean,
  our_product_id uuid,
  had_shortage_request boolean,
  shortage_requests_count integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH erp AS (
    SELECT c.erp_id, c.name, c.qty, c.retail_price, c.wholesale_price, c.fetched_at
    FROM public.erp_full_catalog_cache c
    WHERE c.qty > 0
  ),
  matched AS (
    SELECT e.*, p.id AS our_product_id, p.is_active
    FROM erp e
    LEFT JOIN public.products p
      ON (p.sku = e.erp_id)
  ),
  shortages AS (
    SELECT COALESCE(s.manual_sku, p.sku) AS sku_key, COUNT(*)::int AS cnt
    FROM public.stock_shortage_requests s
    LEFT JOIN public.products p ON p.id = s.product_id
    WHERE s.status IN ('open', 'sourcing', 'pending', 'in_progress')
    GROUP BY COALESCE(s.manual_sku, p.sku)
  )
  SELECT
    m.erp_id,
    m.name,
    m.qty,
    m.retail_price,
    m.wholesale_price,
    m.fetched_at,
    (m.our_product_id IS NOT NULL) AS in_our_system,
    (m.our_product_id IS NOT NULL AND COALESCE(m.is_active, false) = false) AS is_inactive,
    m.our_product_id,
    COALESCE(sh.cnt, 0) > 0 AS had_shortage_request,
    COALESCE(sh.cnt, 0) AS shortage_requests_count
  FROM matched m
  LEFT JOIN shortages sh ON sh.sku_key = m.erp_id
  WHERE (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
    OR public.has_role(auth.uid(), 'reporter'::app_role)
  )
  AND (
    m.our_product_id IS NULL  -- مش موجود على الموقع
    OR COALESCE(m.is_active, false) = false  -- موجود لكن غير مفعّل
  )
  ORDER BY
    COALESCE(sh.cnt, 0) DESC,
    m.qty DESC NULLS LAST,
    m.name;
$$;