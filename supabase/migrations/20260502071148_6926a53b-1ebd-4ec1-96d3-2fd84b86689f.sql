
-- =====================================================================
-- ERP Intraday Baselines: نقطة مقارنة لكاش الفيصل (مش جدول products)
-- الهدف: لما الموظف يضغط "عرفني اللي وصل النهاردة" نقارن أحدث رصيد
-- في الفيصل بآخر snapshot للفيصل ونرجّع الأصناف اللي رصيدها زاد
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.erp_intraday_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  erp_id text NOT NULL,
  name text NOT NULL,
  qty integer NOT NULL DEFAULT 0,
  retail_price numeric,
  wholesale_price numeric,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  triggered_by uuid
);

CREATE INDEX IF NOT EXISTS idx_erp_intraday_baselines_batch
  ON public.erp_intraday_baselines(batch_id);
CREATE INDEX IF NOT EXISTS idx_erp_intraday_baselines_erp_id
  ON public.erp_intraday_baselines(erp_id);
CREATE INDEX IF NOT EXISTS idx_erp_intraday_baselines_snapshot_at
  ON public.erp_intraday_baselines(snapshot_at DESC);

ALTER TABLE public.erp_intraday_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view erp baselines"
  ON public.erp_intraday_baselines FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "Admins manage erp baselines"
  ON public.erp_intraday_baselines FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================================
-- RPC: take_erp_intraday_baseline
-- ياخد snapshot من erp_full_catalog_cache كله بـ batch_id واحد
-- =====================================================================
CREATE OR REPLACE FUNCTION public.take_erp_intraday_baseline()
RETURNS TABLE(batch_id uuid, items_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch uuid := gen_random_uuid();
  v_count integer;
  v_uid uuid := auth.uid();
BEGIN
  IF NOT is_staff(v_uid) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.erp_intraday_baselines
    (batch_id, erp_id, name, qty, retail_price, wholesale_price, triggered_by)
  SELECT v_batch, e.erp_id, e.name, e.qty, e.retail_price, e.wholesale_price, v_uid
  FROM public.erp_full_catalog_cache e;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_batch, v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.take_erp_intraday_baseline() TO authenticated;

-- =====================================================================
-- RPC: erp_intraday_baseline_status
-- آخر snapshot للفيصل + توقيته + عدد الأصناف فيه
-- =====================================================================
CREATE OR REPLACE FUNCTION public.erp_intraday_baseline_status()
RETURNS TABLE(
  has_baseline boolean,
  last_snapshot_at timestamptz,
  minutes_ago integer,
  items_in_baseline integer,
  last_batch_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch uuid;
  v_at timestamptz;
  v_count integer;
BEGIN
  IF NOT is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT b.batch_id, b.snapshot_at INTO v_batch, v_at
  FROM public.erp_intraday_baselines b
  ORDER BY b.snapshot_at DESC
  LIMIT 1;

  IF v_batch IS NULL THEN
    RETURN QUERY SELECT false, NULL::timestamptz, NULL::integer, 0, NULL::uuid;
    RETURN;
  END IF;

  SELECT COUNT(*)::int INTO v_count
  FROM public.erp_intraday_baselines
  WHERE batch_id = v_batch;

  RETURN QUERY SELECT
    true,
    v_at,
    GREATEST(0, EXTRACT(EPOCH FROM (now() - v_at))::int / 60),
    v_count,
    v_batch;
END;
$$;

GRANT EXECUTE ON FUNCTION public.erp_intraday_baseline_status() TO authenticated;

-- =====================================================================
-- RPC: get_today_erp_restocked_items
-- يقارن آخر snapshot بكاش الفيصل الحالي ويرجّع الأصناف اللي زاد رصيدها
-- (سواء جديدة أو موجودة قبل كده)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_today_erp_restocked_items()
RETURNS TABLE(
  erp_id text,
  name text,
  prev_qty integer,
  current_qty integer,
  delta integer,
  was_zero boolean,
  is_new boolean,
  retail_price numeric,
  wholesale_price numeric,
  in_our_system boolean,
  our_product_id uuid,
  had_shortage_request boolean,
  shortage_requests_count integer,
  baseline_at timestamptz,
  minutes_since_baseline integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch uuid;
  v_at timestamptz;
BEGIN
  IF NOT is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- آخر snapshot للفيصل
  SELECT b.batch_id, b.snapshot_at INTO v_batch, v_at
  FROM public.erp_intraday_baselines b
  ORDER BY b.snapshot_at DESC
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
    SELECT e.erp_id, e.name, e.qty, e.retail_price, e.wholesale_price
    FROM public.erp_full_catalog_cache e
  ),
  joined AS (
    SELECT
      c.erp_id,
      c.name,
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
$$;

GRANT EXECUTE ON FUNCTION public.get_today_erp_restocked_items() TO authenticated;
