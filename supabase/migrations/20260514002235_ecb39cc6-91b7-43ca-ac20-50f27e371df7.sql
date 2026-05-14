CREATE OR REPLACE FUNCTION public.get_funnel_analysis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_now timestamptz := now();
  v_30d timestamptz := now() - interval '30 days';
  v_90d timestamptz := now() - interval '90 days';
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  WITH
  -- Match quotes with orders: same user + at least 1 shared product within 30 days
  quote_match AS (
    SELECT q.id AS quote_id, q.user_id, q.quote_number, q.total_amount AS quote_value,
           q.status AS quote_status, q.created_at AS quote_created,
           o.id AS order_id, o.order_number, o.total_amount AS order_value,
           o.status AS order_status, o.created_at AS order_created,
           o.invoice_url, o.delivered_at,
           EXTRACT(EPOCH FROM (o.created_at - q.created_at))/86400.0 AS days_to_convert
    FROM dealer_quotes q
    LEFT JOIN LATERAL (
      SELECT o.* FROM orders o
      WHERE o.user_id = q.user_id
        AND o.created_at >= q.created_at
        AND o.created_at <= q.created_at + interval '30 days'
        AND o.status NOT IN ('cancelled')
        AND EXISTS (
          SELECT 1 FROM order_items oi
          JOIN dealer_quote_items qi ON qi.product_id = oi.product_id AND qi.quote_id = q.id
          WHERE oi.order_id = o.id
        )
      ORDER BY o.created_at ASC LIMIT 1
    ) o ON true
  ),

  -- ===== Stage 1: Quote -> Order =====
  q_stats AS (
    SELECT
      COUNT(*)::int AS total_quotes,
      COUNT(order_id)::int AS converted_quotes,
      COALESCE(SUM(quote_value),0)::numeric AS total_quote_value,
      COALESCE(SUM(quote_value) FILTER (WHERE order_id IS NOT NULL),0)::numeric AS won_value,
      COALESCE(SUM(quote_value) FILTER (WHERE order_id IS NULL),0)::numeric AS lost_value,
      AVG(days_to_convert) FILTER (WHERE order_id IS NOT NULL) AS avg_days_to_convert
    FROM quote_match
  ),

  -- ===== Stage 2: Order -> Invoice =====
  o_stats AS (
    SELECT
      COUNT(*)::int AS total_orders,
      COUNT(*) FILTER (WHERE invoice_url IS NOT NULL OR status IN ('delivered','shipped'))::int AS invoiced_orders,
      COALESCE(SUM(total_amount),0)::numeric AS total_order_value,
      COALESCE(SUM(total_amount) FILTER (WHERE invoice_url IS NOT NULL OR status IN ('delivered','shipped')),0)::numeric AS invoiced_value,
      COALESCE(SUM(total_amount) FILTER (WHERE invoice_url IS NULL AND status NOT IN ('delivered','shipped','cancelled')),0)::numeric AS pending_value
    FROM orders
    WHERE status NOT IN ('cancelled')
  ),

  -- ===== Breakdown by sale tier (from dealer_accounts) =====
  by_tier AS (
    SELECT
      COALESCE(da.tier::text,'retail') AS sale_tier,
      COUNT(DISTINCT qm.quote_id)::int AS quotes,
      COUNT(DISTINCT qm.order_id)::int AS converted,
      ROUND( COUNT(DISTINCT qm.order_id)::numeric * 100.0 / NULLIF(COUNT(DISTINCT qm.quote_id),0), 1) AS rate
    FROM quote_match qm
    LEFT JOIN dealer_accounts da ON da.user_id = qm.user_id
    GROUP BY COALESCE(da.tier::text,'retail')
  ),

  -- ===== Breakdown by brand (from quote items) =====
  by_brand AS (
    SELECT p.brand::text AS brand,
           COUNT(DISTINCT q.id)::int AS quoted_in,
           COUNT(DISTINCT qm.order_id)::int AS converted,
           ROUND(COUNT(DISTINCT qm.order_id)::numeric * 100.0 / NULLIF(COUNT(DISTINCT q.id),0), 1) AS rate,
           SUM(qi.total_price)::numeric AS quote_value
    FROM dealer_quotes q
    JOIN dealer_quote_items qi ON qi.quote_id = q.id
    JOIN products p ON p.id = qi.product_id
    LEFT JOIN quote_match qm ON qm.quote_id = q.id
    GROUP BY p.brand
    ORDER BY quoted_in DESC NULLS LAST
  ),

  -- ===== Breakdown by branch (orders only — quotes have no branch) =====
  by_branch AS (
    SELECT COALESCE(NULLIF(o.pickup_branch,''),'غير محدد') AS branch,
           COUNT(*)::int AS orders_count,
           COUNT(*) FILTER (WHERE invoice_url IS NOT NULL OR status IN ('delivered','shipped'))::int AS invoiced,
           ROUND(COUNT(*) FILTER (WHERE invoice_url IS NOT NULL OR status IN ('delivered','shipped'))::numeric * 100.0 / NULLIF(COUNT(*),0), 1) AS rate,
           SUM(total_amount)::numeric AS revenue
    FROM orders o
    WHERE status NOT IN ('cancelled')
    GROUP BY COALESCE(NULLIF(o.pickup_branch,''),'غير محدد')
    ORDER BY orders_count DESC
  ),

  -- ===== Top closers (customers with highest conversion %) =====
  by_customer AS (
    SELECT qm.user_id, pr.full_name,
           COUNT(*)::int AS quotes,
           COUNT(qm.order_id)::int AS converted,
           ROUND(COUNT(qm.order_id)::numeric * 100.0 / NULLIF(COUNT(*),0), 1) AS rate,
           SUM(qm.quote_value)::numeric AS quote_value,
           SUM(qm.quote_value) FILTER (WHERE qm.order_id IS NULL)::numeric AS lost_value
    FROM quote_match qm
    LEFT JOIN profiles pr ON pr.user_id = qm.user_id
    GROUP BY qm.user_id, pr.full_name
    HAVING COUNT(*) >= 1
  ),

  -- ===== Daily trend (last 30d) =====
  trend AS (
    SELECT d::date AS day,
      (SELECT COUNT(*) FROM dealer_quotes q WHERE q.created_at::date = d::date) AS quotes,
      (SELECT COUNT(*) FROM orders o WHERE o.created_at::date = d::date AND o.status NOT IN ('cancelled')) AS orders
    FROM generate_series(v_30d::date, v_now::date, '1 day'::interval) d
  ),

  -- ===== Lost opportunities: quotes never converted, value desc =====
  lost AS (
    SELECT qm.quote_id, qm.quote_number, qm.quote_value,
           pr.full_name AS customer_name,
           qm.quote_created,
           EXTRACT(DAY FROM (v_now - qm.quote_created))::int AS age_days
    FROM quote_match qm
    LEFT JOIN profiles pr ON pr.user_id = qm.user_id
    WHERE qm.order_id IS NULL
      AND qm.quote_created >= v_90d
      AND qm.quote_value > 0
    ORDER BY qm.quote_value DESC
    LIMIT 20
  ),

  -- ===== Repeat askers (customers with many quotes, low conversion) =====
  repeat_askers AS (
    SELECT qm.user_id, pr.full_name,
           COUNT(*)::int AS quotes_count,
           COUNT(qm.order_id)::int AS conv_count,
           SUM(qm.quote_value)::numeric AS total_quoted,
           ROUND(COUNT(qm.order_id)::numeric * 100.0 / NULLIF(COUNT(*),0), 1) AS conv_rate
    FROM quote_match qm
    LEFT JOIN profiles pr ON pr.user_id = qm.user_id
    GROUP BY qm.user_id, pr.full_name
    HAVING COUNT(*) >= 3 AND COUNT(qm.order_id)::numeric / NULLIF(COUNT(*),0) < 0.3
    ORDER BY COUNT(*) DESC
    LIMIT 15
  ),

  -- ===== Stuck orders: created >= 7 days, not invoiced =====
  stuck_orders AS (
    SELECT o.id, o.order_number, o.total_amount, o.status,
           o.created_at,
           EXTRACT(DAY FROM (v_now - o.created_at))::int AS age_days,
           pr.full_name AS customer_name
    FROM orders o
    LEFT JOIN profiles pr ON pr.user_id = o.user_id
    WHERE o.status NOT IN ('cancelled','delivered','shipped')
      AND o.invoice_url IS NULL
      AND o.created_at < v_now - interval '7 days'
    ORDER BY o.total_amount DESC
    LIMIT 20
  )

  SELECT jsonb_build_object(
    'generated_at', v_now,
    'funnel', jsonb_build_object(
      'quotes_total',     (SELECT total_quotes FROM q_stats),
      'quotes_converted', (SELECT converted_quotes FROM q_stats),
      'quote_to_order_rate',
        ROUND( (SELECT converted_quotes FROM q_stats)::numeric * 100.0 /
               NULLIF((SELECT total_quotes FROM q_stats),0), 1),
      'quote_value_total',(SELECT total_quote_value FROM q_stats),
      'quote_value_won',  (SELECT won_value FROM q_stats),
      'quote_value_lost', (SELECT lost_value FROM q_stats),
      'avg_days_to_convert', (SELECT avg_days_to_convert FROM q_stats),
      'orders_total',     (SELECT total_orders FROM o_stats),
      'orders_invoiced',  (SELECT invoiced_orders FROM o_stats),
      'order_to_invoice_rate',
        ROUND( (SELECT invoiced_orders FROM o_stats)::numeric * 100.0 /
               NULLIF((SELECT total_orders FROM o_stats),0), 1),
      'order_value_total',(SELECT total_order_value FROM o_stats),
      'order_value_invoiced',(SELECT invoiced_value FROM o_stats),
      'order_value_pending', (SELECT pending_value FROM o_stats),
      'full_funnel_rate',
        ROUND( (SELECT invoiced_orders FROM o_stats)::numeric * 100.0 /
               NULLIF((SELECT total_quotes FROM q_stats),0), 1)
    ),
    'by_brand',  (SELECT COALESCE(jsonb_agg(row_to_json(b)),'[]'::jsonb) FROM by_brand b),
    'by_tier',   (SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) FROM by_tier t),
    'by_branch', (SELECT COALESCE(jsonb_agg(row_to_json(b)),'[]'::jsonb) FROM by_branch b),
    'top_closers',(SELECT COALESCE(jsonb_agg(row_to_json(c) ORDER BY (row_to_json(c)->>'rate')::numeric DESC NULLS LAST),'[]'::jsonb)
                   FROM (SELECT * FROM by_customer ORDER BY rate DESC NULLS LAST, converted DESC LIMIT 10) c),
    'weak_closers',(SELECT COALESCE(jsonb_agg(row_to_json(c)),'[]'::jsonb)
                    FROM (SELECT * FROM by_customer WHERE quotes >= 2 ORDER BY rate ASC NULLS FIRST, lost_value DESC LIMIT 10) c),
    'repeat_askers',(SELECT COALESCE(jsonb_agg(row_to_json(r)),'[]'::jsonb) FROM repeat_askers r),
    'lost_opportunities',(SELECT COALESCE(jsonb_agg(row_to_json(l)),'[]'::jsonb) FROM lost l),
    'stuck_orders',(SELECT COALESCE(jsonb_agg(row_to_json(s)),'[]'::jsonb) FROM stuck_orders s),
    'trend',(SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY day),'[]'::jsonb) FROM trend t)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_funnel_analysis() TO authenticated;