-- Daily stock snapshots for restock detection
CREATE TABLE IF NOT EXISTS public.product_stock_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date date NOT NULL,
  product_id uuid NOT NULL,
  stock_quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_date, product_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_snapshots_date ON public.product_stock_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_product ON public.product_stock_snapshots(product_id);

ALTER TABLE public.product_stock_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view stock snapshots"
  ON public.product_stock_snapshots FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "Admins manage stock snapshots"
  ON public.product_stock_snapshots FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function: take a snapshot of current stock for all active products
CREATE OR REPLACE FUNCTION public.take_daily_stock_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
  _today date := CURRENT_DATE;
BEGIN
  INSERT INTO public.product_stock_snapshots (snapshot_date, product_id, stock_quantity)
  SELECT _today, p.id, COALESCE(p.stock_quantity, 0)
  FROM public.products p
  WHERE p.is_active = true
  ON CONFLICT (snapshot_date, product_id) DO UPDATE
    SET stock_quantity = EXCLUDED.stock_quantity;

  GET DIAGNOSTICS _count = ROW_COUNT;

  -- Cleanup snapshots older than 30 days
  DELETE FROM public.product_stock_snapshots
  WHERE snapshot_date < (CURRENT_DATE - INTERVAL '30 days');

  RETURN jsonb_build_object('snapshot_date', _today, 'products_recorded', _count);
END;
$$;

-- Function: get items restocked yesterday (compared to day before)
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
  base_price numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH today_snap AS (
    SELECT product_id, stock_quantity
    FROM public.product_stock_snapshots
    WHERE snapshot_date = CURRENT_DATE
  ),
  prev_snap AS (
    SELECT product_id, stock_quantity
    FROM public.product_stock_snapshots
    WHERE snapshot_date = CURRENT_DATE - _days_back
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
    p.base_price
  FROM public.products p
  INNER JOIN today_snap ts ON ts.product_id = p.id
  LEFT JOIN prev_snap ps ON ps.product_id = p.id
  LEFT JOIN shortages sh ON sh.product_id = p.id
  WHERE p.is_active = true
    AND is_staff(auth.uid())
    AND COALESCE(ts.stock_quantity, 0) > COALESCE(ps.stock_quantity, 0)
  ORDER BY
    (sh.cnt IS NOT NULL) DESC,
    (COALESCE(ps.stock_quantity, 0) = 0) DESC,
    sh.cnt DESC NULLS LAST,
    (COALESCE(ts.stock_quantity, 0) - COALESCE(ps.stock_quantity, 0)) DESC
  LIMIT 100;
$$;

-- Seed today's snapshot immediately so the feature has baseline data
SELECT public.take_daily_stock_snapshot();