CREATE OR REPLACE FUNCTION public.search_all_products_for_shortage(_q text)
RETURNS TABLE (id uuid, sku text, name_ar text, stock_quantity integer, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.sku, p.name_ar, p.stock_quantity, p.is_active
  FROM public.products p
  WHERE (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'reporter'::app_role)
  )
  AND (p.sku ILIKE '%' || _q || '%' OR p.name_ar ILIKE '%' || _q || '%')
  ORDER BY 
    CASE WHEN p.sku ILIKE _q || '%' THEN 0 ELSE 1 END,
    p.is_active DESC,
    p.stock_quantity DESC
  LIMIT 15;
$$;

GRANT EXECUTE ON FUNCTION public.search_all_products_for_shortage(text) TO authenticated;