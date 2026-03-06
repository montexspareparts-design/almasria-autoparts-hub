
-- Maintenance bundles table
CREATE TABLE public.maintenance_bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  image_url TEXT,
  original_price NUMERIC NOT NULL DEFAULT 0,
  bundle_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bundle items linking bundles to products
CREATE TABLE public.bundle_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.maintenance_bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1
);

-- Special offers / featured products columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_price NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

-- RLS for maintenance_bundles (public read)
ALTER TABLE public.maintenance_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bundles"
  ON public.maintenance_bundles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage bundles"
  ON public.maintenance_bundles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for bundle_items (public read)
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bundle items"
  ON public.bundle_items FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage bundle items"
  ON public.bundle_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
