
CREATE OR REPLACE FUNCTION public.apply_erp_part_numbers(
  p_erp_ids text[],
  p_part_numbers text[]
)
RETURNS TABLE(cache_updated int, products_updated int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cache int := 0;
  v_products int := 0;
BEGIN
  WITH src AS (
    SELECT unnest(p_erp_ids) AS erp_id, unnest(p_part_numbers) AS part_number
  ), upd_cache AS (
    UPDATE public.erp_full_catalog_cache c
    SET part_number = s.part_number
    FROM src s
    WHERE c.erp_id = s.erp_id
      AND (c.part_number IS DISTINCT FROM s.part_number)
    RETURNING 1
  )
  SELECT count(*)::int INTO v_cache FROM upd_cache;

  WITH src AS (
    SELECT unnest(p_erp_ids) AS erp_id, unnest(p_part_numbers) AS part_number
  ), upd_p AS (
    UPDATE public.products p
    SET part_number = s.part_number
    FROM src s
    WHERE (p.erp_item_code = s.erp_id OR p.sku = s.erp_id)
      AND (p.part_number IS DISTINCT FROM s.part_number)
    RETURNING 1
  )
  SELECT count(*)::int INTO v_products FROM upd_p;

  RETURN QUERY SELECT v_cache, v_products;
END;
$$;
