
CREATE OR REPLACE FUNCTION public.get_executive_kpis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  today_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Africa/Cairo') AT TIME ZONE 'Africa/Cairo';
  month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'Africa/Cairo') AT TIME ZONE 'Africa/Cairo';
BEGIN
  -- Admin only
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH valid_orders AS (
    SELECT * FROM orders WHERE status NOT IN ('cancelled','pending_payment')
  ),
  sales_today AS (
    SELECT COALESCE(SUM(total_amount),0) AS s, COUNT(*) AS c
    FROM valid_orders WHERE created_at >= today_start
  ),
  sales_month AS (
    SELECT COALESCE(SUM(total_amount),0) AS s, COUNT(*) AS c
    FROM valid_orders WHERE created_at >= month_start
  ),
  cancel_rate AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'cancelled')::float /
      NULLIF(COUNT(*),0)::float * 100 AS pct,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
      COUNT(*) AS total
    FROM orders WHERE created_at >= now() - interval '30 days'
  ),
  inventory AS (
    SELECT
      COALESCE(SUM(stock_quantity * base_price),0) AS total_value,
      COUNT(*) FILTER (WHERE stock_quantity > 0) AS in_stock,
      COUNT(*) FILTER (WHERE stock_quantity > 0 AND stock_quantity <= safety_stock) AS low_stock,
      COUNT(*) FILTER (WHERE stock_quantity = 0) AS out_of_stock,
      COUNT(*) AS total_skus
    FROM products WHERE is_active = true
  ),
  stagnant AS (
    SELECT COUNT(*) AS c, COALESCE(SUM(p.stock_quantity * p.base_price),0) AS v
    FROM products p
    WHERE p.is_active = true AND p.stock_quantity > 0
      AND NOT EXISTS (
        SELECT 1 FROM order_items oi
        JOIN valid_orders o ON o.id = oi.order_id
        WHERE oi.product_id = p.id AND o.created_at >= now() - interval '60 days'
      )
  ),
  top_customers AS (
    SELECT jsonb_agg(row_to_json(t)) AS data FROM (
      SELECT
        o.user_id,
        COALESCE(p.full_name, p.email, 'عميل') AS name,
        COUNT(*) AS orders_count,
        SUM(o.total_amount) AS total_spent
      FROM valid_orders o
      LEFT JOIN profiles p ON p.id = o.user_id
      WHERE o.created_at >= now() - interval '30 days'
      GROUP BY o.user_id, p.full_name, p.email
      ORDER BY total_spent DESC
      LIMIT 5
    ) t
  ),
  top_products AS (
    SELECT jsonb_agg(row_to_json(t)) AS data FROM (
      SELECT
        p.name_ar AS name,
        p.sku,
        SUM(oi.quantity) AS qty_sold,
        SUM(oi.total_price) AS revenue
      FROM order_items oi
      JOIN valid_orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE o.created_at >= now() - interval '30 days'
      GROUP BY p.id, p.name_ar, p.sku
      ORDER BY revenue DESC
      LIMIT 10
    ) t
  ),
  brand_split AS (
    SELECT jsonb_agg(row_to_json(t)) AS data FROM (
      SELECT
        p.brand::text AS brand,
        SUM(oi.total_price) AS revenue,
        SUM(oi.quantity) AS qty
      FROM order_items oi
      JOIN valid_orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE o.created_at >= now() - interval '30 days'
      GROUP BY p.brand
      ORDER BY revenue DESC
    ) t
  ),
  daily_trend AS (
    SELECT jsonb_agg(row_to_json(t) ORDER BY (t->>'day')) AS data FROM (
      SELECT
        to_char(date_trunc('day', created_at AT TIME ZONE 'Africa/Cairo'), 'YYYY-MM-DD') AS day,
        SUM(total_amount) AS revenue,
        COUNT(*) AS orders
      FROM valid_orders
      WHERE created_at >= now() - interval '30 days'
      GROUP BY 1
      ORDER BY 1
    ) t
  )
  SELECT jsonb_build_object(
    'sales_today', (SELECT row_to_json(sales_today) FROM sales_today),
    'sales_month', (SELECT row_to_json(sales_month) FROM sales_month),
    'cancel_rate', (SELECT row_to_json(cancel_rate) FROM cancel_rate),
    'inventory',   (SELECT row_to_json(inventory) FROM inventory),
    'stagnant',    (SELECT row_to_json(stagnant) FROM stagnant),
    'top_customers', (SELECT data FROM top_customers),
    'top_products',  (SELECT data FROM top_products),
    'brand_split',   (SELECT data FROM brand_split),
    'daily_trend',   (SELECT data FROM daily_trend),
    'generated_at',  now()
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_executive_kpis() TO authenticated;
