-- ============================================================
-- Smart Year Coverage System for Products
-- ============================================================
-- Auto-infers year_from, year_to and compatible_models from
-- Arabic product names like "فلتر زيت هاي اس 2005"
-- and computes coverage range based on next product in same family
-- ============================================================

-- 1) Reference list of Toyota model names (Arabic variants)
CREATE TABLE IF NOT EXISTS public.vehicle_model_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL UNIQUE,
  aliases text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_model_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read model aliases" ON public.vehicle_model_aliases;
CREATE POLICY "Anyone can read model aliases" ON public.vehicle_model_aliases
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins manage model aliases" ON public.vehicle_model_aliases;
CREATE POLICY "Admins manage model aliases" ON public.vehicle_model_aliases
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed with common Toyota models in Egypt (Arabic spellings + variants)
INSERT INTO public.vehicle_model_aliases (canonical_name, aliases) VALUES
  ('هاي اس',      ARRAY['هاي اس','هايس','hiace','هاى اس','هاي إس']),
  ('هاي لوكس',    ARRAY['هاي لوكس','هايلوكس','hilux','هاى لوكس']),
  ('كورولا',      ARRAY['كورولا','corolla','كورلا']),
  ('كامري',       ARRAY['كامري','camry','كامرى']),
  ('فورتشنر',     ARRAY['فورتشنر','فورتشينر','fortuner','قورتشنر']),
  ('لاند كروزر',  ARRAY['لاند كروزر','لاندكروزر','لاندكرورز','land cruiser','prado','برادو']),
  ('ياريس',       ARRAY['ياريس','yaris']),
  ('افنزا',       ARRAY['افنزا','افانزا','avanza']),
  ('راف فور',     ARRAY['راف فور','rav4','راف 4']),
  ('بريفيا',      ARRAY['بريفيا','previa']),
  ('كوستر',       ARRAY['كوستر','coaster']),
  ('انوفا',       ARRAY['انوفا','innova']),
  ('بيلتا',       ARRAY['بيلتا','belta']),
  ('ايكو',        ARRAY['ايكو','echo'])
ON CONFLICT (canonical_name) DO UPDATE SET aliases = EXCLUDED.aliases;

-- ============================================================
-- 2) Function: extract year from product name
-- Handles: "2005", "97", "2020" — converts 2-digit (>=80 → 19xx, else 20xx)
-- Returns the FIRST year found (start year)
-- ============================================================
CREATE OR REPLACE FUNCTION public.extract_year_from_name(p_name text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  m text;
  y int;
BEGIN
  IF p_name IS NULL THEN RETURN NULL; END IF;

  -- 4-digit year (1990-2030)
  m := substring(p_name FROM '(19[89]\d|20[0-3]\d)');
  IF m IS NOT NULL THEN
    y := m::int;
    RETURN y;
  END IF;

  -- 2-digit year preceded by space (e.g. " 87", " 93", " 04")
  m := substring(p_name FROM '\s(\d{2})(?:\s|$|&)');
  IF m IS NOT NULL THEN
    y := m::int;
    IF y >= 80 THEN RETURN 1900 + y;
    ELSE RETURN 2000 + y;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

-- ============================================================
-- 3) Function: extract compatible models from product name
-- ============================================================
CREATE OR REPLACE FUNCTION public.extract_models_from_name(p_name text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  result text[] := '{}';
  rec record;
  alias text;
  lower_name text;
BEGIN
  IF p_name IS NULL THEN RETURN result; END IF;
  lower_name := lower(p_name);

  FOR rec IN SELECT canonical_name, aliases FROM public.vehicle_model_aliases LOOP
    FOREACH alias IN ARRAY rec.aliases LOOP
      IF lower_name LIKE '%' || lower(alias) || '%' THEN
        IF NOT (rec.canonical_name = ANY(result)) THEN
          result := array_append(result, rec.canonical_name);
        END IF;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;

  RETURN result;
END;
$$;

-- ============================================================
-- 4) Function: extract part family (first 2-3 meaningful words)
-- Used to group "same kind of part" together
-- e.g. "فلتر زيت", "طقم تيل امامي", "اسطوانة دبرياج"
-- ============================================================
CREATE OR REPLACE FUNCTION public.extract_part_family(p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cleaned text;
  words text[];
  family_words text[] := '{}';
  w text;
  i int := 0;
BEGIN
  IF p_name IS NULL THEN RETURN NULL; END IF;

  -- Remove digits, brand markers (اصلي, ماليزي, FBK, DENSO, ياباني, تركي...) and common noise
  cleaned := regexp_replace(p_name, '\d+', ' ', 'g');
  cleaned := regexp_replace(cleaned, '(اصلي|ماليزي|ياباني|تركي|FBK|DENSO|AISIN|TOYOTA|تويوتا|TM|SAT)', ' ', 'gi');
  cleaned := regexp_replace(cleaned, '[\(\)\[\]&\*]', ' ', 'g');
  cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
  cleaned := trim(cleaned);

  words := string_to_array(cleaned, ' ');

  -- Take first 2-3 words (the part type)
  FOREACH w IN ARRAY words LOOP
    EXIT WHEN i >= 3;
    IF length(w) > 1 AND NOT EXISTS (
      SELECT 1 FROM public.vehicle_model_aliases vma 
      WHERE lower(w) = ANY(SELECT lower(unnest(vma.aliases)))
    ) THEN
      family_words := array_append(family_words, w);
      i := i + 1;
    ELSE
      EXIT; -- Stop at first model name
    END IF;
  END LOOP;

  IF array_length(family_words, 1) IS NULL THEN RETURN NULL; END IF;
  RETURN array_to_string(family_words, ' ');
END;
$$;

-- ============================================================
-- 5) MAIN: Auto-fill year_from + compatible_models for all products
-- ============================================================
UPDATE public.products
SET 
  year_from = COALESCE(year_from, public.extract_year_from_name(name_ar)),
  compatible_models = CASE 
    WHEN compatible_models IS NULL OR array_length(compatible_models, 1) IS NULL OR array_length(compatible_models, 1) = 0
    THEN public.extract_models_from_name(name_ar)
    ELSE compatible_models
  END
WHERE is_active = true;

-- ============================================================
-- 6) Compute year_to based on next product in same family/model
-- For each product: year_to = (next_year - 1), or current year if no next
-- ============================================================
CREATE OR REPLACE FUNCTION public.recompute_product_year_coverage()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_year int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
BEGIN
  -- For each product, find the next year in the same (part_family, primary_model) group
  WITH ranked AS (
    SELECT 
      p.id,
      p.year_from,
      public.extract_part_family(p.name_ar) AS family,
      CASE WHEN array_length(p.compatible_models, 1) > 0 
           THEN p.compatible_models[1] 
           ELSE NULL END AS primary_model,
      LEAD(p.year_from) OVER (
        PARTITION BY 
          public.extract_part_family(p.name_ar),
          CASE WHEN array_length(p.compatible_models, 1) > 0 
               THEN p.compatible_models[1] 
               ELSE NULL END
        ORDER BY p.year_from ASC NULLS LAST
      ) AS next_year
    FROM public.products p
    WHERE p.is_active = true 
      AND p.year_from IS NOT NULL
  )
  UPDATE public.products pr
  SET year_to = COALESCE(r.next_year - 1, current_year)
  FROM ranked r
  WHERE pr.id = r.id
    AND r.year_from IS NOT NULL;
END;
$$;

-- Run it now
SELECT public.recompute_product_year_coverage();

-- ============================================================
-- 7) Trigger to auto-compute on insert/update
-- ============================================================
CREATE OR REPLACE FUNCTION public.products_auto_year_inference()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only auto-fill if not provided manually
  IF NEW.year_from IS NULL THEN
    NEW.year_from := public.extract_year_from_name(NEW.name_ar);
  END IF;

  IF NEW.compatible_models IS NULL OR array_length(NEW.compatible_models, 1) IS NULL THEN
    NEW.compatible_models := public.extract_models_from_name(NEW.name_ar);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_auto_year_inference ON public.products;
CREATE TRIGGER trg_products_auto_year_inference
  BEFORE INSERT OR UPDATE OF name_ar ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_auto_year_inference();

-- ============================================================
-- 8) Helper view for fast searching by year coverage
-- ============================================================
CREATE OR REPLACE FUNCTION public.search_products_by_year(
  p_query text DEFAULT NULL,
  p_year int DEFAULT NULL,
  p_model text DEFAULT NULL
)
RETURNS SETOF public.products
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p.*
  FROM public.products p
  WHERE p.is_active = true
    AND (
      p_query IS NULL 
      OR p.name_ar ILIKE '%' || p_query || '%'
      OR p.sku ILIKE '%' || p_query || '%'
    )
    AND (
      p_model IS NULL 
      OR p_model = ANY(p.compatible_models)
    )
    AND (
      p_year IS NULL
      OR p.year_from IS NULL
      OR (p.year_from <= p_year AND COALESCE(p.year_to, EXTRACT(YEAR FROM CURRENT_DATE)::int) >= p_year)
    )
  ORDER BY 
    -- Exact year match first
    CASE WHEN p.year_from = p_year THEN 0 ELSE 1 END,
    p.year_from DESC NULLS LAST;
$$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_products_year_from ON public.products(year_from) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_compatible_models ON public.products USING GIN(compatible_models) WHERE is_active = true;