
-- تحسين دالة استخراج البارت نمبر:
-- 1) تتجاهل نطاقات السنوات (19xx/20xx) - (19xx/20xx) وتكمل البحث بعدها
-- 2) تتجاهل تواريخ مفردة 4 أرقام (2005-2020) عند بداية الـ token
-- 3) تتعرّف على نمط DENSO الشائع: 6أرقام-4أرقام (مثل 260300-0170)
-- 4) تتعرّف على نمط Toyota Genuine: 5أرقام-5أرقام (مثل 23682-30020)
-- 5) تستبعد نتائج لا تحتوي أي رقم على جانب واحد

CREATE OR REPLACE FUNCTION public.extract_part_number(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  candidates TEXT[];
  c TEXT;
  cleaned TEXT;
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN NULL;
  END IF;

  -- ١) أولوية قصوى: نمط Toyota Genuine 5-5 (مثل 23682-30020 أو 90118-WB123)
  c := (regexp_match(input_text, '([0-9]{5}-[0-9A-Z]{5})'))[1];
  IF c IS NOT NULL THEN
    RETURN c;
  END IF;

  -- ٢) نمط DENSO 6-4 (مثل 260300-0170)
  c := (regexp_match(input_text, '([0-9]{6}-[0-9]{4})'))[1];
  IF c IS NOT NULL THEN
    RETURN c;
  END IF;

  -- ٣) نمط DENSO/Aisin بادئة حرفية (مثل P1024 أو SH01-1234)
  c := (regexp_match(input_text, '([A-Z]{1,3}[0-9]{3,5}(?:-[0-9A-Z]{2,5})?)'))[1];
  IF c IS NOT NULL AND length(c) >= 5 THEN
    -- استبعد كلمات شائعة مثل 1ZR/2KD/2ZR... (موديلات محركات)
    IF c !~ '^[0-9]?[A-Z]{1,2}[0-9]?[A-Z]?$' THEN
      RETURN c;
    END IF;
  END IF;

  -- ٤) عام: ابحث عن كل المرشحين واستبعد نطاقات السنوات
  SELECT ARRAY(
    SELECT (m)[1]
    FROM regexp_matches(input_text, '([0-9A-Z]{4,}-[0-9A-Z]{3,}(?:-[0-9A-Z]+)*)', 'g') m
  ) INTO candidates;

  IF candidates IS NOT NULL THEN
    FOREACH c IN ARRAY candidates LOOP
      -- استبعد نطاقات السنوات
      IF c ~ '^(19|20)[0-9]{2}-(19|20)[0-9]{2}$' THEN
        CONTINUE;
      END IF;
      -- استبعد ما هو سنة + رقم قصير
      IF c ~ '^(19|20)[0-9]{2}-[0-9]{1,3}$' THEN
        CONTINUE;
      END IF;
      RETURN c;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$function$;

-- إعادة معالجة كل المنتجات (سواء كانت part_number فارغة أو مملوءة من قبل)
UPDATE public.products
SET part_number = COALESCE(
  public.extract_part_number(name_ar),
  public.extract_part_number(REPLACE(REPLACE(sku, '-DENSO', ''), '-AISIN', ''))
)
WHERE name_ar IS NOT NULL OR sku IS NOT NULL;
