
-- =============================================================
-- ERP Restock Period History
-- نقدر نقارن رصيد الفيصل الحالي بأقدم snapshot ضمن فترة معينة
-- (اليوم / امبارح / آخر 7 أيام / آخر 30 يوم)
-- =============================================================

-- دالة عامة: ترجع الأصناف اللي رصيدها زاد بين أقدم snapshot في الفترة
-- وأحدث snapshot/كاش متاح. لو مفيش snapshot في الفترة بنرجع لائحة فاضية.
CREATE OR REPLACE FUNCTION public.get_erp_restocked_items_period(_period text DEFAULT 'today')
RETURNS TABLE (
  erp_id text,
  name text,
  prev_qty integer,
  current_qty integer,
  delta integer,
  was_zero boolean,
  is_new boolean,
  retail_price numeric,
  had_shortage_request boolean,
  baseline_at timestamptz,
  current_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from timestamptz;
  v_to   timestamptz;
  v_baseline_batch uuid;
  v_baseline_at timestamptz;
  v_current_at timestamptz;
BEGIN
  -- صلاحية: موظف فقط
  IF NOT public.is_staff(auth.uid()) THEN
    RETURN;
  END IF;

  -- حدّد الفترة (start_of_today بتوقيت Africa/Cairo)
  IF _period = 'today' THEN
    v_from := date_trunc('day', (now() AT TIME ZONE 'Africa/Cairo')) AT TIME ZONE 'Africa/Cairo';
    v_to   := NULL;
  ELSIF _period = 'yesterday' THEN
    v_from := (date_trunc('day', (now() AT TIME ZONE 'Africa/Cairo')) - interval '1 day') AT TIME ZONE 'Africa/Cairo';
    v_to   := date_trunc('day', (now() AT TIME ZONE 'Africa/Cairo')) AT TIME ZONE 'Africa/Cairo';
  ELSIF _period = 'week' THEN
    v_from := (date_trunc('day', (now() AT TIME ZONE 'Africa/Cairo')) - interval '6 days') AT TIME ZONE 'Africa/Cairo';
    v_to   := NULL;
  ELSIF _period = 'month' THEN
    v_from := (date_trunc('day', (now() AT TIME ZONE 'Africa/Cairo')) - interval '29 days') AT TIME ZONE 'Africa/Cairo';
    v_to   := NULL;
  ELSE
    -- fallback = today
    v_from := date_trunc('day', (now() AT TIME ZONE 'Africa/Cairo')) AT TIME ZONE 'Africa/Cairo';
    v_to   := NULL;
  END IF;

  -- اختار أقدم batch في الفترة كنقطة baseline
  SELECT b.batch_id, b.snapshot_at INTO v_baseline_batch, v_baseline_at
  FROM erp_intraday_baselines b
  WHERE b.snapshot_at >= v_from
    AND (v_to IS NULL OR b.snapshot_at < v_to)
  ORDER BY b.snapshot_at ASC
  LIMIT 1;

  -- لو مفيش baseline في الفترة → فاضي
  IF v_baseline_batch IS NULL THEN
    RETURN;
  END IF;

  -- آخر وقت لكاش الفيصل (مرجع "حالي")
  SELECT MAX(c.fetched_at) INTO v_current_at FROM erp_full_catalog_cache c;

  RETURN QUERY
  WITH baseline AS (
    SELECT b.erp_id, b.qty AS prev_qty, b.name AS prev_name
    FROM erp_intraday_baselines b
    WHERE b.batch_id = v_baseline_batch
  ),
  current_cache AS (
    SELECT c.erp_id, c.qty AS current_qty, c.name AS current_name, c.retail_price
    FROM erp_full_catalog_cache c
  ),
  diffs AS (
    SELECT
      COALESCE(c.erp_id, b.erp_id) AS erp_id,
      COALESCE(c.current_name, b.prev_name) AS name,
      COALESCE(b.prev_qty, 0) AS prev_qty,
      COALESCE(c.current_qty, 0) AS current_qty,
      COALESCE(c.current_qty, 0) - COALESCE(b.prev_qty, 0) AS delta,
      (COALESCE(b.prev_qty, 0) = 0 AND COALESCE(c.current_qty, 0) > 0) AS was_zero,
      (b.erp_id IS NULL AND COALESCE(c.current_qty, 0) > 0) AS is_new,
      c.retail_price
    FROM baseline b
    FULL OUTER JOIN current_cache c ON c.erp_id = b.erp_id
  ),
  shortages AS (
    SELECT DISTINCT s.manual_sku AS erp_id
    FROM stock_shortage_requests s
    WHERE s.manual_sku IS NOT NULL
      AND s.created_at >= (now() - interval '60 days')
  )
  SELECT
    d.erp_id,
    d.name,
    d.prev_qty,
    d.current_qty,
    d.delta,
    d.was_zero,
    d.is_new,
    d.retail_price,
    (sh.erp_id IS NOT NULL) AS had_shortage_request,
    v_baseline_at AS baseline_at,
    v_current_at AS current_at
  FROM diffs d
  LEFT JOIN shortages sh ON sh.erp_id = d.erp_id
  WHERE d.delta > 0
  ORDER BY (sh.erp_id IS NOT NULL) DESC, d.delta DESC, d.current_qty DESC
  LIMIT 500;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_erp_restocked_items_period(text) TO authenticated;

-- =============================================================
-- Cron يومي 6 صباحاً بتوقيت القاهرة (= 4 UTC) يلتقط snapshot
-- من كاش الفيصل عشان نبني تاريخ "وصل امبارح/أسبوع/شهر" تدريجياً
-- =============================================================
CREATE OR REPLACE FUNCTION public.cron_take_daily_erp_baseline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch uuid := gen_random_uuid();
  v_inserted integer;
BEGIN
  -- لو الكاش قديم جداً (>3 ساعات) منعملش snapshot — نسيب لما يتجدد
  IF NOT EXISTS (
    SELECT 1 FROM erp_full_catalog_cache
    WHERE fetched_at >= now() - interval '3 hours'
    LIMIT 1
  ) THEN
    RAISE NOTICE 'ERP cache too old, skipping daily baseline';
    RETURN;
  END IF;

  INSERT INTO erp_intraday_baselines (batch_id, erp_id, name, qty, retail_price, wholesale_price, snapshot_at)
  SELECT v_batch, c.erp_id, c.name, c.qty, c.retail_price, c.wholesale_price, now()
  FROM erp_full_catalog_cache c;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RAISE NOTICE 'Daily ERP baseline taken: % items in batch %', v_inserted, v_batch;
END;
$$;

-- جدول الـ cron (لو pg_cron مفعّل بالفعل)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- شيل أي job قديم بنفس الاسم
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'daily-erp-baseline-snapshot';

    -- 06:00 توقيت القاهرة = 04:00 UTC
    PERFORM cron.schedule(
      'daily-erp-baseline-snapshot',
      '0 4 * * *',
      $cron$ SELECT public.cron_take_daily_erp_baseline(); $cron$
    );
  END IF;
END $$;
