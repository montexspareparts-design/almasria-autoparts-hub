CREATE OR REPLACE FUNCTION public.get_executive_kpis()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH valid_orders AS (
    SELECT * FROM orders WHERE status NOT IN ('cancelled')
  ),
  sales_today AS (
    SELECT COALESCE(SUM(total_amount),0)::numeric AS amount, COUNT(*)::int AS count
    FROM valid_orders
    WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Africa/Cairo')
  ),
  sales_month AS (
    SELECT COALESCE(SUM(total_amount),0)::numeric AS amount, COUNT(*)::int AS count
    FROM valid_orders
    WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Africa/Cairo')
  ),
  inventory_value AS (
    SELECT COALESCE(SUM(qty * COALESCE(retail_price, wholesale_price, 0)), 0)::numeric AS value,
           COUNT(*)::int AS items_count
    FROM erp_full_catalog_cache
    WHERE qty > 0
  ),
  low_stock_count AS (
    SELECT COUNT(*)::int AS count
    FROM products
    WHERE stock_quantity > 0 AND stock_quantity < COALESCE(safety_stock, 5)
  ),
  out_of_stock_count AS (
    SELECT COUNT(*)::int AS count FROM products WHERE stock_quantity <= 0
  ),
  top_customers AS (
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) AS data FROM (
      SELECT
        o.user_id,
        COALESCE(p.full_name, p.email, 'عميل') AS name,
        COUNT(*) AS orders_count,
        SUM(o.total_amount) AS total_spent
      FROM valid_orders o
      LEFT JOIN profiles p ON p.user_id = o.user_id
      WHERE o.created_at >= now() - interval '30 days'
      GROUP BY o.user_id, p.full_name, p.email
      ORDER BY total_spent DESC
      LIMIT 5
    ) t
  ),
  top_brands AS (
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) AS data FROM (
      SELECT p.brand, COUNT(*) AS items_sold, SUM(oi.unit_price * oi.quantity) AS revenue
      FROM order_items oi
      JOIN valid_orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE o.created_at >= now() - interval '30 days'
      GROUP BY p.brand
      ORDER BY revenue DESC
    ) t
  ),
  daily_trend AS (
    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.day), '[]'::jsonb) AS data FROM (
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
    'inventory_value', (SELECT row_to_json(inventory_value) FROM inventory_value),
    'low_stock_count', (SELECT count FROM low_stock_count),
    'out_of_stock_count', (SELECT count FROM out_of_stock_count),
    'top_customers', (SELECT data FROM top_customers),
    'top_brands', (SELECT data FROM top_brands),
    'daily_trend', (SELECT data FROM daily_trend),
    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_executive_kpis() TO authenticated;