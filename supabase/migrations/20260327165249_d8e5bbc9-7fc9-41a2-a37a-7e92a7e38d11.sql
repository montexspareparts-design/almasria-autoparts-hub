
CREATE OR REPLACE FUNCTION public.get_best_selling_products(_limit integer DEFAULT 8)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oi.product_id
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.products p ON p.id = oi.product_id
  WHERE o.status IN ('processing', 'ready', 'shipped', 'delivered')
    AND p.is_active = true
  GROUP BY oi.product_id
  ORDER BY SUM(oi.quantity) DESC
  LIMIT _limit
$$;
