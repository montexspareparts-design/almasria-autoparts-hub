CREATE TABLE IF NOT EXISTS public.erp_full_catalog_cache (
  erp_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  retail_price NUMERIC,
  wholesale_price NUMERIC,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_erp_full_catalog_id_text ON public.erp_full_catalog_cache (erp_id text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_erp_full_catalog_fetched ON public.erp_full_catalog_cache (fetched_at);

ALTER TABLE public.erp_full_catalog_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read ERP catalog cache"
ON public.erp_full_catalog_cache
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.erp_full_catalog_meta (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_synced_at TIMESTAMPTZ,
  total_items INTEGER DEFAULT 0,
  last_error TEXT
);

INSERT INTO public.erp_full_catalog_meta (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.erp_full_catalog_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read ERP catalog meta"
ON public.erp_full_catalog_meta
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.search_erp_full_catalog(_q text)
RETURNS TABLE(
  erp_id text,
  name text,
  qty integer,
  retail_price numeric,
  wholesale_price numeric,
  fetched_at timestamptz,
  in_our_system boolean,
  our_product_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.erp_id,
    c.name,
    c.qty,
    c.retail_price,
    c.wholesale_price,
    c.fetched_at,
    (p.id IS NOT NULL) AS in_our_system,
    p.id AS our_product_id
  FROM public.erp_full_catalog_cache c
  LEFT JOIN public.products p
    ON (p.erp_item_code = c.erp_id OR p.sku = c.erp_id)
  WHERE (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
    OR public.has_role(auth.uid(), 'reporter'::app_role)
  )
  AND (
    _q IS NULL OR _q = '' OR
    c.erp_id ILIKE '%' || _q || '%' OR
    c.name ILIKE '%' || _q || '%'
  )
  ORDER BY
    CASE WHEN c.erp_id ILIKE _q || '%' THEN 0 ELSE 1 END,
    c.qty DESC NULLS LAST,
    c.name
  LIMIT 30;
$$;