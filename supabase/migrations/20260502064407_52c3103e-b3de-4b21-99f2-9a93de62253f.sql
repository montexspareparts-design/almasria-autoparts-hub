-- 1) جدول baseline اللحظي (لقطات داخل اليوم بدون unique على التاريخ)
CREATE TABLE IF NOT EXISTS public.intraday_stock_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stock_quantity integer NOT NULL DEFAULT 0,
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  batch_id uuid NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_intraday_baselines_at ON public.intraday_stock_baselines(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_intraday_baselines_batch ON public.intraday_stock_baselines(batch_id);
CREATE INDEX IF NOT EXISTS idx_intraday_baselines_product ON public.intraday_stock_baselines(product_id);

ALTER TABLE public.intraday_stock_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view intraday baselines"
  ON public.intraday_stock_baselines FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "Admins manage intraday baselines"
  ON public.intraday_stock_baselines FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2) دالة إنشاء baseline لحظي جديد من رصيد products الحالي
CREATE OR REPLACE FUNCTION public.take_intraday_stock_baseline()
RETURNS TABLE(batch_id uuid, snapshot_at timestamptz, items_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _batch uuid := gen_random_uuid();
  _now timestamptz := now();
  _user uuid := auth.uid();
  _count integer := 0;
BEGIN
  -- نشرط على staff فقط
  IF NOT is_staff(_user) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.intraday_stock_baselines (snapshot_at, product_id, stock_quantity, triggered_by, batch_id)
  SELECT _now, p.id, COALESCE(p.stock_quantity, 0), _user, _batch
  FROM public.products p
  WHERE p.is_active = true;

  GET DIAGNOSTICS _count = ROW_COUNT;

  RETURN QUERY SELECT _batch, _now, _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.take_intraday_stock_baseline() TO authenticated;

-- 3) دالة ترجع الأصناف اللي رصيدها زاد بعد آخر intraday baseline
CREATE OR REPLACE FUNCTION public.get_today_restocked_items()
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
  shortage_requests_count integer,
  base_price numeric,
  baseline_at timestamptz,
  minutes_since_baseline integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH last_batch AS (
    SELECT batch_id, MAX(snapshot_at) AS snap_at
    FROM public.intraday_stock_baselines
    GROUP BY batch_id
    ORDER BY snap_at DESC
    LIMIT 1
  ),
  base AS (
    SELECT b.product_id, b.stock_quantity AS prev, lb.snap_at
    FROM public.intraday_stock_baselines b
    JOIN last_batch lb ON lb.batch_id = b.batch_id
  ),
  shortages AS (
    SELECT s.product_id, COUNT(*)::int AS cnt
    FROM public.stock_shortage_requests s
    WHERE s.status IN ('pending', 'in_progress')
    GROUP BY s.product_id
  )
  SELECT
    p.id,
    p.sku,
    p.name_ar,
    p.brand,
    base.prev,
    p.stock_quantity,
    (p.stock_quantity - base.prev) AS delta,
    (base.prev = 0) AS was_zero,
    COALESCE(s.cnt, 0) > 0 AS had_shortage_request,
    COALESCE(s.cnt, 0) AS shortage_requests_count,
    p.base_price,
    base.snap_at,
    EXTRACT(EPOCH FROM (now() - base.snap_at))::integer / 60 AS minutes_since_baseline
  FROM public.products p
  JOIN base ON base.product_id = p.id
  LEFT JOIN shortages s ON s.product_id = p.id
  WHERE p.is_active = true
    AND p.stock_quantity > base.prev
  ORDER BY (p.stock_quantity - base.prev) DESC, p.name_ar ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_today_restocked_items() TO authenticated;

-- 4) حالة الـ baseline اللحظي
CREATE OR REPLACE FUNCTION public.intraday_baseline_status()
RETURNS TABLE(
  has_baseline boolean,
  last_snapshot_at timestamptz,
  minutes_ago integer,
  items_in_baseline integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH last_batch AS (
    SELECT batch_id, MAX(snapshot_at) AS snap_at, COUNT(*)::int AS cnt
    FROM public.intraday_stock_baselines
    GROUP BY batch_id
    ORDER BY snap_at DESC
    LIMIT 1
  )
  SELECT
    (lb.batch_id IS NOT NULL) AS has_baseline,
    lb.snap_at,
    CASE WHEN lb.snap_at IS NULL THEN NULL
         ELSE (EXTRACT(EPOCH FROM (now() - lb.snap_at))::integer / 60) END AS minutes_ago,
    COALESCE(lb.cnt, 0) AS items_in_baseline
  FROM (SELECT 1) x
  LEFT JOIN last_batch lb ON true;
$$;

GRANT EXECUTE ON FUNCTION public.intraday_baseline_status() TO authenticated;