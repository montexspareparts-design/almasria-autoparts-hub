
-- مشترك مياه = water-cooling, مناول دريكسيون = steering
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'water-cooling')
WHERE is_active = true AND category_id IS NULL AND name_ar ILIKE '%مشترك مياه%';

UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'steering')
WHERE is_active = true AND category_id IS NULL AND name_ar ILIKE '%مناول%';
