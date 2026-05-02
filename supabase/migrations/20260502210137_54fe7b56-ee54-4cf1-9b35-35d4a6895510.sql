
-- 1) إضافة العمود
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS part_number TEXT;

-- 2) دالة استخراج البارت نمبر من الاسم
CREATE OR REPLACE FUNCTION public.extract_part_number(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  matched TEXT;
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN NULL;
  END IF;

  -- pattern: ≥5 حروف/أرقام لاتينية + شَرَط + ≥3 + اختياري شَرَط ثاني
  matched := (regexp_match(input_text, '([0-9A-Z]{5,}[-][0-9A-Z]{3,}(?:[-][0-9A-Z]+)*)'))[1];

  -- استثناء نطاقات السنوات مثل 2008-2020
  IF matched IS NOT NULL AND matched ~ '^(19|20)[0-9]{2}-(19|20)[0-9]{2}$' THEN
    RETURN NULL;
  END IF;

  RETURN matched;
END;
$$;

-- 3) Backfill: ملء العمود للأصناف الموجودة
UPDATE public.products
SET part_number = public.extract_part_number(name_ar)
WHERE part_number IS NULL;

-- 4) Trigger يحافظ على البارت نمبر تلقائياً عند الإدخال/التحديث
CREATE OR REPLACE FUNCTION public.auto_set_part_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- فقط لو المستخدم مادخلش بارت نمبر يدوي
  IF NEW.part_number IS NULL OR NEW.part_number = '' THEN
    NEW.part_number := public.extract_part_number(NEW.name_ar);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_part_number ON public.products;
CREATE TRIGGER trg_auto_part_number
BEFORE INSERT OR UPDATE OF name_ar ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_part_number();

-- 5) Index للبحث بالبارت نمبر
CREATE INDEX IF NOT EXISTS idx_products_part_number ON public.products(part_number) WHERE part_number IS NOT NULL;
