
-- =========== get_executive_alerts() ===========
CREATE OR REPLACE FUNCTION public.get_executive_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  alerts jsonb := '[]'::jsonb;
  rec record;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- HIGH: Out of stock for fast-moving items (sold > 5 units in last 30d)
  FOR rec IN
    SELECT p.id, p.sku, p.name_ar, p.stock_quantity, p.safety_stock,
           COALESCE(SUM(oi.quantity),0) AS sold_30d
    FROM products p
    LEFT JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN orders o ON o.id = oi.order_id
      AND o.created_at >= now() - interval '30 days'
      AND o.status NOT IN ('cancelled','pending_payment')
    WHERE p.is_active = true
    GROUP BY p.id
    HAVING SUM(oi.quantity) > 5 AND p.stock_quantity <= COALESCE(p.safety_stock,2)
    ORDER BY SUM(oi.quantity) DESC
    LIMIT 15
  LOOP
    alerts := alerts || jsonb_build_object(
      'severity','high',
      'type','stock_critical',
      'title','صنف سريع الحركة قارب على النفاد',
      'reason', format('بيع %s قطعة في 30 يوم — رصيد حالي %s', rec.sold_30d, rec.stock_quantity),
      'metric', rec.stock_quantity,
      'sku', rec.sku,
      'name', rec.name_ar,
      'action','إعادة طلب فوري من المورد'
    );
  END LOOP;

  -- HIGH: Big customer stopped (spent > 5000 last 90d but nothing in 30d)
  FOR rec IN
    WITH cust AS (
      SELECT o.user_id,
             COALESCE(p.full_name, p.email, 'عميل') AS name,
             SUM(o.total_amount) FILTER (WHERE o.created_at >= now() - interval '90 days') AS spent_90d,
             SUM(o.total_amount) FILTER (WHERE o.created_at >= now() - interval '30 days') AS spent_30d,
             MAX(o.created_at) AS last_order
      FROM orders o
      LEFT JOIN profiles p ON p.user_id = o.user_id
      WHERE o.status NOT IN ('cancelled','pending_payment')
      GROUP BY o.user_id, p.full_name, p.email
    )
    SELECT * FROM cust
    WHERE spent_90d > 5000 AND COALESCE(spent_30d,0) = 0
    ORDER BY spent_90d DESC LIMIT 10
  LOOP
    alerts := alerts || jsonb_build_object(
      'severity','high',
      'type','customer_churn',
      'title','عميل مهم توقف عن الشراء',
      'reason', format('%s — صرف %s ج.م في 90 يوم وآخر طلب %s', rec.name, round(rec.spent_90d), to_char(rec.last_order,'YYYY-MM-DD')),
      'metric', round(rec.spent_90d),
      'user_id', rec.user_id,
      'action','اتصال فوري + عرض خاص'
    );
  END LOOP;

  -- HIGH: Cancellation rate spike (>40% last 7 days)
  FOR rec IN
    SELECT
      COUNT(*) FILTER (WHERE status='cancelled')::float / NULLIF(COUNT(*),0)::float * 100 AS pct,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status='cancelled') AS cancelled
    FROM orders WHERE created_at >= now() - interval '7 days'
    HAVING COUNT(*) > 5
       AND COUNT(*) FILTER (WHERE status='cancelled')::float / NULLIF(COUNT(*),0)::float > 0.4
  LOOP
    alerts := alerts || jsonb_build_object(
      'severity','high',
      'type','cancellation_spike',
      'title','ارتفاع غير طبيعي في إلغاء الطلبات',
      'reason', format('%s%% إلغاء (%s من %s) في 7 أيام', round(rec.pct::numeric,1), rec.cancelled, rec.total),
      'metric', round(rec.pct::numeric,1),
      'action','مراجعة أسباب الإلغاء فوراً'
    );
  END LOOP;

  -- MEDIUM: Stagnant inventory > 60 days with high value
  FOR rec IN
    SELECT p.id, p.sku, p.name_ar, p.stock_quantity, p.base_price,
           p.stock_quantity * p.base_price AS locked_value
    FROM products p
    WHERE p.is_active = true AND p.stock_quantity > 0
      AND p.stock_quantity * p.base_price > 5000
      AND NOT EXISTS (
        SELECT 1 FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.product_id = p.id
          AND o.created_at >= now() - interval '60 days'
          AND o.status NOT IN ('cancelled','pending_payment')
      )
    ORDER BY p.stock_quantity * p.base_price DESC
    LIMIT 10
  LOOP
    alerts := alerts || jsonb_build_object(
      'severity','medium',
      'type','stagnant_stock',
      'title','مخزون راكد أكثر من 60 يوم',
      'reason', format('قيمة معطلة %s ج.م — رصيد %s قطعة', round(rec.locked_value), rec.stock_quantity),
      'metric', round(rec.locked_value),
      'sku', rec.sku,
      'name', rec.name_ar,
      'action','عرض ترويجي / خصم لتحريك المخزون'
    );
  END LOOP;

  -- MEDIUM: Customer purchases dropped > 50% vs previous period
  FOR rec IN
    WITH cust AS (
      SELECT o.user_id,
             COALESCE(p.full_name, p.email, 'عميل') AS name,
             SUM(o.total_amount) FILTER (WHERE o.created_at >= now() - interval '30 days') AS curr,
             SUM(o.total_amount) FILTER (WHERE o.created_at >= now() - interval '60 days' AND o.created_at < now() - interval '30 days') AS prev
      FROM orders o
      LEFT JOIN profiles p ON p.user_id = o.user_id
      WHERE o.status NOT IN ('cancelled','pending_payment')
      GROUP BY o.user_id, p.full_name, p.email
    )
    SELECT * FROM cust
    WHERE COALESCE(prev,0) > 2000 AND COALESCE(curr,0) < prev * 0.5 AND COALESCE(curr,0) > 0
    ORDER BY prev DESC LIMIT 10
  LOOP
    alerts := alerts || jsonb_build_object(
      'severity','medium',
      'type','customer_decline',
      'title','عميل مشترياته قلت بشدة',
      'reason', format('%s — نزل من %s إلى %s ج.م', rec.name, round(rec.prev), round(COALESCE(rec.curr,0))),
      'metric', round(COALESCE(rec.curr,0)),
      'user_id', rec.user_id,
      'action','مكالمة متابعة ومعرفة السبب'
    );
  END LOOP;

  -- LOW: Out-of-stock count operational
  FOR rec IN
    SELECT COUNT(*) AS oos FROM products WHERE is_active=true AND stock_quantity=0
    HAVING COUNT(*) > 0
  LOOP
    alerts := alerts || jsonb_build_object(
      'severity','low',
      'type','operational',
      'title','أصناف نافدة',
      'reason', format('%s صنف رصيدهم صفر حالياً', rec.oos),
      'metric', rec.oos,
      'action','مراجعة قائمة النواقص مع المخزن'
    );
  END LOOP;

  RETURN jsonb_build_object('alerts', alerts, 'generated_at', now());
END;
$$;

-- =========== get_customer_churn() ===========
CREATE OR REPLACE FUNCTION public.get_customer_churn()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH cust AS (
    SELECT
      o.user_id,
      COALESCE(p.full_name, p.email, 'عميل') AS name,
      p.phone,
      MAX(o.created_at) AS last_order_at,
      COUNT(*) FILTER (WHERE o.created_at >= now() - interval '90 days') AS orders_90d,
      COALESCE(SUM(o.total_amount) FILTER (WHERE o.created_at >= now() - interval '30 days'),0) AS spent_30d,
      COALESCE(SUM(o.total_amount) FILTER (WHERE o.created_at >= now() - interval '60 days' AND o.created_at < now() - interval '30 days'),0) AS spent_30_60,
      COALESCE(SUM(o.total_amount) FILTER (WHERE o.created_at >= now() - interval '90 days' AND o.created_at < now() - interval '60 days'),0) AS spent_60_90,
      COALESCE(SUM(o.total_amount) FILTER (WHERE o.created_at >= now() - interval '180 days'),0) AS spent_180d,
      COUNT(*) AS lifetime_orders
    FROM orders o
    LEFT JOIN profiles p ON p.user_id = o.user_id
    WHERE o.status NOT IN ('cancelled','pending_payment')
    GROUP BY o.user_id, p.full_name, p.email, p.phone
  ),
  scored AS (
    SELECT *,
      EXTRACT(DAY FROM now() - last_order_at)::int AS days_since,
      CASE WHEN spent_30_60 > 0 THEN
        ROUND(((spent_30_60 - spent_30d)::numeric / spent_30_60::numeric) * 100, 1)
      ELSE NULL END AS drop_pct,
      -- Risk score 0..100
      LEAST(100, GREATEST(0,
        CASE
          WHEN spent_180d > 10000 THEN 30
          WHEN spent_180d > 3000 THEN 20
          ELSE 10
        END
        + LEAST(50, EXTRACT(DAY FROM now() - last_order_at)::int)
        + CASE
            WHEN spent_30_60 > 0 AND spent_30d < spent_30_60 * 0.3 THEN 20
            WHEN spent_30_60 > 0 AND spent_30d < spent_30_60 * 0.5 THEN 10
            ELSE 0
          END
      ))::int AS risk_score
    FROM cust
    WHERE spent_180d > 500
  )
  SELECT jsonb_build_object(
    'customers', COALESCE(jsonb_agg(row_to_json(s) ORDER BY (s.risk_score) DESC), '[]'::jsonb),
    'generated_at', now()
  )
  INTO result
  FROM (
    SELECT *,
      CASE
        WHEN risk_score >= 70 THEN 'اتصال فوري + عرض خاص'
        WHEN risk_score >= 50 THEN 'زيارة مندوب أو واتساب'
        WHEN risk_score >= 30 THEN 'متابعة عادية'
        ELSE 'مراقبة'
      END AS suggested_action,
      CASE
        WHEN days_since > 60 THEN 'لم يشترِ منذ شهرين'
        WHEN drop_pct IS NOT NULL AND drop_pct > 50 THEN format('انخفاض %s%% في الشراء', drop_pct)
        WHEN spent_30d = 0 THEN 'متوقف عن الشراء هذا الشهر'
        ELSE 'تباطؤ في الشراء'
      END AS risk_reason
    FROM scored
    WHERE risk_score >= 30
    ORDER BY risk_score DESC
    LIMIT 50
  ) s;

  RETURN result;
END;
$$;
