-- Add missing categories
INSERT INTO product_categories (name_ar, name_en, slug, icon, sort_order) VALUES
  ('كشافات ولمبات', 'Lights & Lamps', 'lights', 'Lightbulb', 11),
  ('اكصدامات', 'Bumpers', 'bumpers', 'Shield', 12),
  ('مرايات', 'Mirrors', 'mirrors', 'Glasses', 13),
  ('جوانات', 'Gaskets', 'gaskets', 'Layers', 14),
  ('اويل سيل', 'Oil Seals', 'oil-seals', 'CircleDot', 15),
  ('دينامو وكهرباء', 'Electrical', 'electrical', 'Zap', 16),
  ('مساعدين', 'Shock Absorbers', 'shocks', 'ArrowUpDown', 17),
  ('كاوتشات', 'Rubber Parts', 'rubber', 'Circle', 18)
ON CONFLICT (slug) DO NOTHING;

-- Auto-categorize products based on keywords in name
-- Filters
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'filters')
WHERE category_id IS NULL AND (name_ar ILIKE '%FILTER%' OR name_ar ILIKE '%فلتر%' OR name_ar ILIKE '%ELEMENT%AIR%' OR name_ar ILIKE '%ELEMENT%OIL%');

-- Shock Absorbers
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'shocks')
WHERE category_id IS NULL AND (name_ar ILIKE '%SHOCK%' OR name_ar ILIKE '%ABSORBER%' OR name_ar ILIKE '%مساعد%');

-- Spark Plugs & Coils
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'spark-plugs-coils')
WHERE category_id IS NULL AND (name_ar ILIKE '%PLUG%' OR name_ar ILIKE '%COIL%' OR name_ar ILIKE '%IGNIT%' OR name_ar ILIKE '%بوجي%' OR name_ar ILIKE '%مبين%');

-- Belts & Bearings
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'belts-bearings')
WHERE category_id IS NULL AND (name_ar ILIKE '%BELT%' OR name_ar ILIKE '%BEARING%' OR name_ar ILIKE '%سير%' OR name_ar ILIKE '%بلي%' OR name_ar ILIKE '%TENSIONER%' OR name_ar ILIKE '%PULLEY%');

-- Brakes
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'brakes')
WHERE category_id IS NULL AND (name_ar ILIKE '%BRAKE%' OR name_ar ILIKE '%PAD%' OR name_ar ILIKE '%DISC%BRAKE%' OR name_ar ILIKE '%فرامل%' OR name_ar ILIKE '%تيل%' OR name_ar ILIKE '%CALIPER%');

-- Clutch
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'clutch')
WHERE category_id IS NULL AND (name_ar ILIKE '%CLUTCH%' OR name_ar ILIKE '%دبرياج%' OR name_ar ILIKE '%FLYWHEEL%');

-- Cooling System
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'water-cooling')
WHERE category_id IS NULL AND (name_ar ILIKE '%RADIATOR%' OR name_ar ILIKE '%WATER PUMP%' OR name_ar ILIKE '%THERMOSTAT%' OR name_ar ILIKE '%COOLANT%' OR name_ar ILIKE '%FAN%COOL%' OR name_ar ILIKE '%HOSE%WATER%' OR name_ar ILIKE '%مياه%' OR name_ar ILIKE '%رادي%');

-- Lights & Lamps
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'lights')
WHERE category_id IS NULL AND (name_ar ILIKE '%LAMP%' OR name_ar ILIKE '%LIGHT%' OR name_ar ILIKE '%HEADL%' OR name_ar ILIKE '%TAIL%' OR name_ar ILIKE '%BULB%' OR name_ar ILIKE '%كشاف%' OR name_ar ILIKE '%لمبه%');

-- Bumpers
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'bumpers')
WHERE category_id IS NULL AND (name_ar ILIKE '%BUMPER%' OR name_ar ILIKE '%FENDER%' OR name_ar ILIKE '%HOOD%' OR name_ar ILIKE '%GRILLE%' OR name_ar ILIKE '%اكصدام%' OR name_ar ILIKE '%شبك%');

-- Mirrors
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'mirrors')
WHERE category_id IS NULL AND (name_ar ILIKE '%MIRROR%' OR name_ar ILIKE '%مراي%' OR name_ar ILIKE '%مرآ%');

-- Gaskets
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'gaskets')
WHERE category_id IS NULL AND (name_ar ILIKE '%GASKET%' OR name_ar ILIKE '%جوان%');

-- Oil Seals
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'oil-seals')
WHERE category_id IS NULL AND (name_ar ILIKE '%SEAL%' OR name_ar ILIKE '%اويل سيل%');

-- Suspension
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'suspension')
WHERE category_id IS NULL AND (name_ar ILIKE '%ARM%' OR name_ar ILIKE '%LINK%' OR name_ar ILIKE '%JOINT%' OR name_ar ILIKE '%BUSH%' OR name_ar ILIKE '%STABILIZ%' OR name_ar ILIKE '%مقص%' OR name_ar ILIKE '%عفشه%' OR name_ar ILIKE '%BALL JOINT%');

-- Steering
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'steering')
WHERE category_id IS NULL AND (name_ar ILIKE '%STEER%' OR name_ar ILIKE '%RACK%' OR name_ar ILIKE '%TIE ROD%' OR name_ar ILIKE '%عمه%' OR name_ar ILIKE '%عمة%' OR name_ar ILIKE '%مقود%' OR name_ar ILIKE '%POWER STEER%');

-- Electrical
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'electrical')
WHERE category_id IS NULL AND (name_ar ILIKE '%STARTER%' OR name_ar ILIKE '%ALTERNATOR%' OR name_ar ILIKE '%DYNAMO%' OR name_ar ILIKE '%MOTOR%WIPER%' OR name_ar ILIKE '%SENSOR%' OR name_ar ILIKE '%SWITCH%' OR name_ar ILIKE '%RELAY%' OR name_ar ILIKE '%دينامو%' OR name_ar ILIKE '%سلف%');

-- Oils (gasoline)
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'oils-gasoline')
WHERE category_id IS NULL AND (name_ar ILIKE '%زيت%بنزين%' OR name_ar ILIKE '%ENGINE OIL%' OR (name_ar ILIKE '%OIL%' AND name_ar ILIKE '%ENGINE%'));

-- Oils (diesel)
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'oils-diesel')
WHERE category_id IS NULL AND (name_ar ILIKE '%زيت%ديزل%' OR (name_ar ILIKE '%OIL%' AND name_ar ILIKE '%DIESEL%'));

-- Oils (transmission)
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'oils-transmission')
WHERE category_id IS NULL AND (name_ar ILIKE '%زيت%فتيس%' OR name_ar ILIKE '%TRANSMISSION%OIL%' OR name_ar ILIKE '%ATF%' OR name_ar ILIKE '%GEAR OIL%' OR name_ar ILIKE '%CVT%FLUID%');

-- Rubber Parts
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'rubber')
WHERE category_id IS NULL AND (name_ar ILIKE '%BOOT%' OR name_ar ILIKE '%RUBBER%' OR name_ar ILIKE '%MOUNT%' OR name_ar ILIKE '%كاوتش%');

-- Fiber/Body Parts  
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE slug = 'fiber-parts')
WHERE category_id IS NULL AND (name_ar ILIKE '%DOOR%' OR name_ar ILIKE '%PANEL%' OR name_ar ILIKE '%COVER%BODY%' OR name_ar ILIKE '%فيبر%' OR name_ar ILIKE '%باب%');