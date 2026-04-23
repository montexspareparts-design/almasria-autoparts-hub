-- Replace partsouq image URLs with images stored in our own Supabase Storage.
-- Strategy: for each product whose image_url points to partsouq, pick a random
-- Storage image from a product in the same category (any brand for FBK fallback,
-- preferring same brand otherwise).

WITH partsouq_products AS (
  SELECT id, brand, category_id
  FROM products
  WHERE image_url LIKE '%partsouq%'
),
-- Same brand + same category candidates
same_brand_cat AS (
  SELECT DISTINCT ON (p.id)
    p.id AS target_id,
    s.image_url AS new_url
  FROM partsouq_products p
  JOIN products s
    ON s.brand = p.brand
   AND s.category_id = p.category_id
   AND s.image_url LIKE '%supabase.co/storage%'
  ORDER BY p.id, random()
),
-- Same category fallback (any brand) for products without same-brand match
same_cat AS (
  SELECT DISTINCT ON (p.id)
    p.id AS target_id,
    s.image_url AS new_url
  FROM partsouq_products p
  LEFT JOIN same_brand_cat sbc ON sbc.target_id = p.id
  JOIN products s
    ON s.category_id = p.category_id
   AND s.image_url LIKE '%supabase.co/storage%'
  WHERE sbc.target_id IS NULL
  ORDER BY p.id, random()
),
-- Same brand fallback (any category)
same_brand AS (
  SELECT DISTINCT ON (p.id)
    p.id AS target_id,
    s.image_url AS new_url
  FROM partsouq_products p
  LEFT JOIN same_brand_cat sbc ON sbc.target_id = p.id
  LEFT JOIN same_cat sc ON sc.target_id = p.id
  JOIN products s
    ON s.brand = p.brand
   AND s.image_url LIKE '%supabase.co/storage%'
  WHERE sbc.target_id IS NULL AND sc.target_id IS NULL
  ORDER BY p.id, random()
),
chosen AS (
  SELECT target_id, new_url FROM same_brand_cat
  UNION ALL
  SELECT target_id, new_url FROM same_cat
  UNION ALL
  SELECT target_id, new_url FROM same_brand
)
UPDATE products p
SET image_url = c.new_url,
    updated_at = now()
FROM chosen c
WHERE p.id = c.target_id
  AND p.image_url LIKE '%partsouq%';