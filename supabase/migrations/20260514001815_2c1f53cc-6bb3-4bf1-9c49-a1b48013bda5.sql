CREATE OR REPLACE FUNCTION public.get_financial_intelligence()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_now timestamptz := now();
  v_30d timestamptz := now() - interval '30 days';
  v_60d timestamptz := now() - interval '60 days';
  v_90d timestamptz := now() - interval '90 days';
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  WITH
  valid_orders AS (
    SELECT o.id, o.user_id, o.created_at, o.total_amount,
           COALESCE(o.coupon_discount,0) AS coupon_discount,
           COALESCE(NULLIF(o.pickup_branch,''),'غير محدد') AS branch
    FROM orders o
    WHERE o.status NOT IN ('cancelled')
  ),
  oi AS (
    SELECT vo.id AS order_id, vo.user_id, vo.created_at, vo.branch,
           oi.product_id, oi.quantity, oi.unit_price, oi.total_price,
           p.brand, p.base_price, p.name_ar, p.sku, p.stock_quantity,
           (p.base_price - oi.unit_price) * oi.quantity AS discount_value,
           COALESCE(da.tier::text, 'retail') AS sale_tier
    FROM valid_orders vo
    JOIN order_items oi ON oi.order_id = vo.id
    JOIN products p ON p.id = oi.product_id
    LEFT JOIN dealer_accounts da ON da.user_id = vo.user_id
  ),

  -- 1) Profitability by brand (proxy = revenue - discount)
  by_brand AS (
    SELECT brand::text AS brand,
           SUM(total_price)::numeric AS revenue,
           SUM(GREATEST(discount_value,0))::numeric AS discount,
           SUM(quantity)::int AS qty,
           (SUM(total_price) - SUM(GREATEST(discount_value,0)))::numeric AS margin_proxy
    FROM oi GROUP BY brand
    ORDER BY revenue DESC NULLS LAST
  ),
  -- 2) by sale type
  by_sale_type AS (
    SELECT sale_tier,
           SUM(total_price)::numeric AS revenue,
           SUM(quantity)::int AS qty,
           AVG(unit_price)::numeric AS avg_price
    FROM oi GROUP BY sale_tier
    ORDER BY revenue DESC NULLS LAST
  ),
  -- 3) by branch
  by_branch AS (
    SELECT branch,
           SUM(total_price)::numeric AS revenue,
           COUNT(DISTINCT order_id)::int AS orders_count,
           COUNT(DISTINCT user_id)::int AS customers,
           SUM(GREATEST(discount_value,0))::numeric AS discount
    FROM oi GROUP BY branch
    ORDER BY revenue DESC NULLS LAST
  ),
  -- 4) top customers by margin_proxy
  by_customer AS (
    SELECT vo.user_id,
           pr.full_name,
           SUM(oi2.total_price)::numeric AS revenue,
           SUM(GREATEST(oi2.unit_price * oi2.quantity - (p.base_price * oi2.quantity), 0))::numeric AS over_paid,
           COUNT(DISTINCT vo.id)::int AS orders_count,
           (SUM(oi2.total_price) / NULLIF(COUNT(DISTINCT vo.id),0))::numeric AS aov
    FROM valid_orders vo
    JOIN order_items oi2 ON oi2.order_id = vo.id
    JOIN products p ON p.id = oi2.product_id
    LEFT JOIN profiles pr ON pr.user_id = vo.user_id
    GROUP BY vo.user_id, pr.full_name
  ),
  top_customers AS (
    SELECT * FROM by_customer ORDER BY revenue DESC NULLS LAST LIMIT 10
  ),
  weak_customers AS (
    SELECT * FROM by_customer WHERE revenue > 0 ORDER BY aov ASC NULLS LAST LIMIT 10
  ),
  -- 5) high turnover low margin products
  prod_perf AS (
    SELECT product_id, name_ar, sku, brand::text AS brand,
           SUM(quantity)::int AS qty_sold,
           SUM(total_price)::numeric AS revenue,
           SUM(GREATEST(discount_value,0))::numeric AS discount_burn,
           AVG(base_price - unit_price)::numeric AS avg_discount_per_unit,
           MAX(stock_quantity)::int AS current_stock
    FROM oi GROUP BY product_id, name_ar, sku, brand
  ),
  high_turnover_low_margin AS (
    SELECT * FROM prod_perf
    WHERE qty_sold >= 5 AND avg_discount_per_unit > 0
    ORDER BY discount_burn DESC NULLS LAST LIMIT 15
  ),
  -- 6) Discount impact totals
  discount_impact AS (
    SELECT
      (SELECT COALESCE(SUM(coupon_discount),0) FROM valid_orders) AS coupon_total,
      (SELECT COALESCE(SUM(GREATEST(discount_value,0)),0) FROM oi) AS price_discount_total,
      (SELECT COALESCE(SUM(total_price),0) FROM oi) AS revenue_total
  ),

  -- 7) Forecasting: avg daily sales last 60d
  sales_60 AS (
    SELECT oi3.product_id, SUM(oi3.quantity)::numeric AS qty_60
    FROM order_items oi3
    JOIN orders o2 ON o2.id = oi3.order_id
    WHERE o2.status NOT IN ('cancelled') AND o2.created_at >= v_60d
    GROUP BY oi3.product_id
  ),
  forecast AS (
    SELECT p.id AS product_id, p.sku, p.name_ar, p.brand::text AS brand,
           p.stock_quantity, COALESCE(p.safety_stock,0) AS safety_stock,
           COALESCE(s.qty_60,0)/60.0 AS avg_daily,
           CASE WHEN COALESCE(s.qty_60,0) > 0
                THEN (p.stock_quantity / (s.qty_60/60.0))::int
                ELSE NULL END AS days_remaining,
           -- reorder point: lead_time(7d) * avg_daily + safety
           CEIL(7 * (COALESCE(s.qty_60,0)/60.0) + COALESCE(p.safety_stock,0))::int AS reorder_point,
           -- suggested qty: cover next 30d - current_stock
           GREATEST(0, CEIL(30 * (COALESCE(s.qty_60,0)/60.0)) - p.stock_quantity)::int AS suggested_qty
    FROM products p
    LEFT JOIN sales_60 s ON s.product_id = p.id
    WHERE p.is_active = true
  ),
  forecast_urgent AS (
    SELECT * FROM forecast
    WHERE avg_daily > 0
      AND (days_remaining IS NULL OR days_remaining <= 21 OR stock_quantity <= reorder_point)
    ORDER BY (CASE WHEN days_remaining IS NULL THEN 999 ELSE days_remaining END) ASC
    LIMIT 30
  ),

  -- 8) Dead inventory: stock>0 + zero sales 90d
  sold_90 AS (
    SELECT DISTINCT oi4.product_id
    FROM order_items oi4
    JOIN orders o3 ON o3.id = oi4.order_id
    WHERE o3.status NOT IN ('cancelled') AND o3.created_at >= v_90d
  ),
  dead AS (
    SELECT p.id AS product_id, p.sku, p.name_ar, p.brand::text AS brand,
           p.stock_quantity, p.base_price,
           (p.stock_quantity * p.base_price)::numeric AS frozen_value,
           p.updated_at
    FROM products p
    WHERE p.is_active = true
      AND p.stock_quantity > 0
      AND p.id NOT IN (SELECT product_id FROM sold_90)
    ORDER BY (p.stock_quantity * p.base_price) DESC NULLS LAST
    LIMIT 30
  ),
  dead_summary AS (
    SELECT
      COUNT(*)::int AS items_count,
      COALESCE(SUM(stock_quantity * base_price), 0)::numeric AS total_frozen_value
    FROM products p
    WHERE p.is_active = true
      AND p.stock_quantity > 0
      AND p.id NOT IN (SELECT product_id FROM sold_90)
  ),

  -- 9) Branch performance score
  branch_score AS (
    SELECT
      branch,
      revenue,
      orders_count,
      customers,
      discount,
      -- Score 0-100: revenue 50%, orders 30%, customers 20%
      ROUND(
        (revenue / NULLIF((SELECT MAX(revenue) FROM by_branch),0) * 50) +
        (orders_count::numeric / NULLIF((SELECT MAX(orders_count) FROM by_branch),0) * 30) +
        (customers::numeric / NULLIF((SELECT MAX(customers) FROM by_branch),0) * 20)
      , 1) AS score
    FROM by_branch
  )

  SELECT jsonb_build_object(
    'generated_at', v_now,
    'profitability', jsonb_build_object(
      'by_brand', (SELECT COALESCE(jsonb_agg(row_to_json(b)), '[]'::jsonb) FROM by_brand b),
      'by_sale_type', (SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb) FROM by_sale_type s),
      'by_branch', (SELECT COALESCE(jsonb_agg(row_to_json(b)), '[]'::jsonb) FROM by_branch b),
      'top_customers', (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM top_customers t),
      'weak_customers', (SELECT COALESCE(jsonb_agg(row_to_json(w)), '[]'::jsonb) FROM weak_customers w),
      'high_turnover_low_margin', (SELECT COALESCE(jsonb_agg(row_to_json(h)), '[]'::jsonb) FROM high_turnover_low_margin h),
      'discount_impact', (SELECT row_to_json(d) FROM discount_impact d)
    ),
    'forecast', jsonb_build_object(
      'urgent', (SELECT COALESCE(jsonb_agg(row_to_json(f)), '[]'::jsonb) FROM forecast_urgent f),
      'total_active', (SELECT COUNT(*) FROM products WHERE is_active = true)
    ),
    'dead_inventory', jsonb_build_object(
      'items', (SELECT COALESCE(jsonb_agg(row_to_json(d)), '[]'::jsonb) FROM dead d),
      'summary', (SELECT row_to_json(s) FROM dead_summary s)
    ),
    'branch_performance', (SELECT COALESCE(jsonb_agg(row_to_json(b) ORDER BY (row_to_json(b)->>'score')::numeric DESC), '[]'::jsonb) FROM branch_score b)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_intelligence() TO authenticated;