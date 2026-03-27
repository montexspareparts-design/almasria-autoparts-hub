
-- Add model and year columns to products for better filtering
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS compatible_models text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS year_from integer,
  ADD COLUMN IF NOT EXISTS year_to integer;

-- Create index for model search
CREATE INDEX IF NOT EXISTS idx_products_compatible_models ON public.products USING GIN (compatible_models);
CREATE INDEX IF NOT EXISTS idx_products_year_range ON public.products (year_from, year_to);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products (brand);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
