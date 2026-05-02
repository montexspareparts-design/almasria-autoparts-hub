CREATE OR REPLACE FUNCTION public.restock_baseline_status(_days_back integer DEFAULT 1)
RETURNS TABLE(
  has_baseline boolean,
  earliest_snapshot date,
  latest_snapshot date,
  distinct_days integer,
  baseline_target_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH s AS (
    SELECT
      MIN(snapshot_date) AS earliest,
      MAX(snapshot_date) AS latest,
      COUNT(DISTINCT snapshot_date)::int AS days
    FROM public.product_stock_snapshots
  )
  SELECT
    -- baseline موجود فقط لو في سنابشوت تاريخه أقدم من (اليوم - عدد أيام المقارنة)
    COALESCE(
      (SELECT EXISTS (
        SELECT 1 FROM public.product_stock_snapshots
        WHERE snapshot_date <= (CURRENT_DATE - GREATEST(_days_back, 1))
      )), false
    ) AS has_baseline,
    s.earliest,
    s.latest,
    s.days,
    (CURRENT_DATE - GREATEST(_days_back, 1))::date AS baseline_target_date
  FROM s;
$$;

GRANT EXECUTE ON FUNCTION public.restock_baseline_status(integer) TO authenticated;