
-- Categorize remaining 122 uncategorized products

-- تكييف → we need an AC category, let's use electrical for now since there's no AC category
-- تيل = brakes
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'brakes')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%تيل %' OR name_ar ILIKE '%طقم تيل%');

-- تكييف (AC parts) → electrical
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'electrical')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%تكييف%' OR name_ar ILIKE '%كباس تكييف%' OR name_ar ILIKE '%سربنتينة%' OR name_ar ILIKE '%اكسبنشن%');

-- عفشة / تيش / ميزان / صرة = suspension
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'suspension')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%ميزان%' OR name_ar ILIKE '%صرة عجل%' OR name_ar ILIKE '%كرتيرة عجل%' OR name_ar ILIKE '%تيش%');

-- كاتينة / شداد كاتينة = belts-bearings
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'belts-bearings')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%كاتينة%' OR name_ar ILIKE '%شداد كاتينة%');

-- رشاش جاز / فونية / حشوة جاز = electrical (fuel injection)
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'electrical')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%رشاش جاز%' OR name_ar ILIKE '%فونية%' OR name_ar ILIKE '%حشوة جاز%');

-- بستم / سبيكة / شنبر = engine internals → gaskets (closest category)
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'gaskets')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%بستم%' OR name_ar ILIKE '%سبيكة%' OR name_ar ILIKE '%شنبر%' OR name_ar ILIKE '%صباب%' OR name_ar ILIKE '%كرنك%');

-- شبكة / حلية شبكة / كبوت / فبرة = bumpers/body
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'bumpers')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%شبكة%' OR name_ar ILIKE '%حلية%' OR name_ar ILIKE '%كبوت%' OR name_ar ILIKE '%فبرة%');

-- ريشة مساحة / عوامة / غطاء = misc → electrical
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'electrical')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%ريشة مساحة%' OR name_ar ILIKE '%عوامة%' OR name_ar ILIKE '%غطاء%' OR name_ar ILIKE '%سخان%');

-- فتيس = clutch/transmission
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'clutch')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%فتيس%' OR name_ar ILIKE '%فولام%');

-- جنط عجل / مسمار عجل / صامولة عجل = suspension
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'suspension')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%جنط عجل%' OR name_ar ILIKE '%مسمار عجل%' OR name_ar ILIKE '%صامولة عجل%');

-- كلاتش مروحة = water-cooling
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'water-cooling')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%مروحة%');

-- كردان / صليبة = belts-bearings
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'belts-bearings')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%كردان%' OR name_ar ILIKE '%صليبة%');

-- زيت باكم / طبة زيت = oils-transmission
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'oils-transmission')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%زيت باكم%' OR name_ar ILIKE '%طبة زيت%');

-- جلبة / حامل / طبة هوك / جاويط = misc → rubber
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'rubber')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%جلبة%' OR name_ar ILIKE '%طبة هوك%' OR name_ar ILIKE '%جاويط%');

-- بلف (non-AC valve) → gaskets/engine
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'gaskets')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%بلف شداد%' OR name_ar ILIKE '%بلف %');

-- حامل = body/bumpers
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'bumpers')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%حامل%');

-- كاركة = gaskets
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'gaskets')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%كاركة%');

-- مسمار بلف = oil-seals
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'oil-seals')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%مسمار بلف%');

-- سوستة = suspension
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'suspension')
WHERE is_active = true AND category_id IS NULL AND (name_ar ILIKE '%سوستة%');
