CREATE OR REPLACE FUNCTION public.get_currently_in_stock_items()
RETURNS TABLE(
  product_id uuid,
  sku text,
  name_ar text,
  brand text,
  current_stock integer,
  base_price numeric,
  snapshot_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest AS (
    SELECT MAX(snapshot_date) AS d FROM public.product_stock_snapshots
  )
  SELECT
    p.id AS product_id,
    p.sku,
    p.name_ar,
    p.brand,
    s.stock_quantity AS current_stock,
    p.base_price,
    s.snapshot_date
  FROM public.product_stock_snapshots s
  JOIN public.products p ON p.id = s.product_id
  CROSS JOIN latest
  WHERE s.snapshot_date = latest.d
    AND s.stock_quantity > 0
    AND p.is_active = true
  ORDER BY s.stock_quantity DESC, p.name_ar ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_currently_in_stock_items() TO authenticated;