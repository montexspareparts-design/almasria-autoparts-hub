-- Fix: handle duplicate years in same family correctly
CREATE OR REPLACE FUNCTION public.recompute_product_year_coverage()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_year int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
BEGIN
  -- Step 1: get DISTINCT years per (family, primary_model) and compute next year for each
  WITH distinct_years AS (
    SELECT DISTINCT
      public.extract_part_family(p.name_ar) AS family,
      CASE WHEN array_length(p.compatible_models, 1) > 0 
           THEN p.compatible_models[1] 
           ELSE NULL END AS primary_model,
      p.year_from
    FROM public.products p
    WHERE p.is_active = true AND p.year_from IS NOT NULL
  ),
  next_year_map AS (
    SELECT 
      family,
      primary_model,
      year_from,
      LEAD(year_from) OVER (
        PARTITION BY family, primary_model
        ORDER BY year_from ASC
      ) AS next_year
    FROM distinct_years
  )
  UPDATE public.products pr
  SET year_to = GREATEST(
    pr.year_from,
    COALESCE(nym.next_year - 1, current_year)
  )
  FROM next_year_map nym
  WHERE pr.is_active = true
    AND pr.year_from = nym.year_from
    AND public.extract_part_family(pr.name_ar) IS NOT DISTINCT FROM nym.family
    AND (CASE WHEN array_length(pr.compatible_models, 1) > 0 
              THEN pr.compatible_models[1] 
              ELSE NULL END) IS NOT DISTINCT FROM nym.primary_model;
END;
$$;

-- Re-run with the fix
SELECT public.recompute_product_year_coverage();