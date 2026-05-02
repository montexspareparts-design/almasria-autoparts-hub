
-- إضافة عمود part_number لكاش الفيصل + استخراج تلقائي من name
ALTER TABLE public.erp_full_catalog_cache
  ADD COLUMN IF NOT EXISTS part_number text;

CREATE OR REPLACE FUNCTION public.auto_set_erp_cache_part_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.part_number IS NULL OR NEW.part_number = '' THEN
    NEW.part_number := public.extract_part_number(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_erp_cache_part_number ON public.erp_full_catalog_cache;
CREATE TRIGGER trg_auto_erp_cache_part_number
BEFORE INSERT OR UPDATE OF name ON public.erp_full_catalog_cache
FOR EACH ROW EXECUTE FUNCTION public.auto_set_erp_cache_part_number();

-- ملء الموجود حالياً
UPDATE public.erp_full_catalog_cache
SET part_number = public.extract_part_number(name)
WHERE name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_erp_cache_part_number ON public.erp_full_catalog_cache(part_number);
