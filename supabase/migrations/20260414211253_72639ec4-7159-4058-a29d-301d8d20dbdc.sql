
-- Backfill category_id for products that have NULL category_id
-- Based on keyword matching in name_ar

-- Filters (فلاتر)
UPDATE products SET category_id = 'ecef660c-f87f-4a9c-9a8b-e59747c89e4a'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%فلتر%' AND name_ar NOT ILIKE '%جوان فلتر%');

-- Spark plugs & coils (بوجيهات ومباين)
UPDATE products SET category_id = '48e0ebb7-340d-441b-b1cf-0c99c5ba0c57'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%بوجيه%' OR name_ar ILIKE '%بوجية%' OR name_ar ILIKE '%مباين%' OR name_ar ILIKE '%موبينة%' OR name_ar ILIKE '%شمعة احتراق%');

-- Brakes (فرامل)
UPDATE products SET category_id = 'a1b2c3d4-1111-4aaa-bbbb-000000000001'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%تيل فرامل%' OR name_ar ILIKE '%فرامل%' OR name_ar ILIKE '%ديسك فرامل%' OR name_ar ILIKE '%طنبورة%');

-- Water cooling (دورة تبريد)
UPDATE products SET category_id = '09a14d9e-2ea8-41e3-a7f6-856ef07455da'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%ريداتير%' OR name_ar ILIKE '%ثرموستات%' OR name_ar ILIKE '%تبريد%' OR name_ar ILIKE '%طرمبة مياه%' OR name_ar ILIKE '%خرطوم مياه%' OR name_ar ILIKE '%رداتير%');

-- Electrical (دينامو وكهرباء)
UPDATE products SET category_id = '9734a15a-d58e-4f91-b782-ca1a75fa8864'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%دينامو%' OR name_ar ILIKE '%سلف%' OR name_ar ILIKE '%مارش%' OR name_ar ILIKE '%كهرباء%' OR name_ar ILIKE '%حساس%' OR name_ar ILIKE '%سنسور%');

-- Oils gasoline (زيوت بنزين)
UPDATE products SET category_id = 'd1158937-c28f-49cf-a619-697d2b7e4c30'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%زيت محرك%' OR name_ar ILIKE '%زيت بنزين%' OR name_ar ILIKE '%زيت موتور%')
AND name_ar NOT ILIKE '%ديزل%' AND name_ar NOT ILIKE '%فتيس%' AND name_ar NOT ILIKE '%جير%';

-- Oils diesel (زيوت ديزل)
UPDATE products SET category_id = '56017308-e3d8-4f8a-9980-923b74d5e418'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%زيت ديزل%' OR name_ar ILIKE '%ديزل%');

-- Oils transmission (زيوت فتيس)
UPDATE products SET category_id = 'ef06a871-7a0e-4eab-9981-ef8b994949de'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%زيت فتيس%' OR name_ar ILIKE '%زيت جير%' OR name_ar ILIKE '%atf%' OR name_ar ILIKE '%زيت نقل%' OR name_ar ILIKE '%زيت باور%');

-- Clutch (دبرياج)
UPDATE products SET category_id = 'f8a124ce-2e36-4f99-96d2-08f712be79e8'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%دبرياج%' OR name_ar ILIKE '%ديسك دبرياج%' OR name_ar ILIKE '%اسطوانة دبرياج%');

-- Suspension (عفشة)
UPDATE products SET category_id = '16b17fea-082a-409a-9aa1-578c0b0ba299'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%عفشة%' OR name_ar ILIKE '%مقص%' OR name_ar ILIKE '%كبالن%' OR name_ar ILIKE '%مشط%' OR name_ar ILIKE '%مساعد عفشة%');

-- Shocks (مساعدين)
UPDATE products SET category_id = '04abd58f-128a-4700-8292-684dc0e4fff2'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%مساعد%' OR name_ar ILIKE '%شوك ابسوربر%')
AND name_ar NOT ILIKE '%عفشة%';

-- Gaskets (جوانات)
UPDATE products SET category_id = 'd7a6fcec-0ef7-4f39-8fa8-043b8c046264'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%جوان%' OR name_ar ILIKE '%وجه%');

-- Oil seals (اويل سيل)
UPDATE products SET category_id = 'e1e26698-03cf-4245-9b84-07cd86099ad1'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%اويل سيل%' OR name_ar ILIKE '%سيل%' OR name_ar ILIKE '%oil seal%');

-- Belts & bearings (سيور وبلي)
UPDATE products SET category_id = '7aca05f6-affe-4cee-977c-ba66a363a935'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%سير%' OR name_ar ILIKE '%بلية%' OR name_ar ILIKE '%بلي %' OR name_ar ILIKE '%تايمنج%');

-- Lights (كشافات)
UPDATE products SET category_id = 'bc034708-1b34-4720-b6a1-4b27d37b44e4'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%كشاف%' OR name_ar ILIKE '%فانوس%' OR name_ar ILIKE '%لمبة%' OR name_ar ILIKE '%اشاره%');

-- Bumpers (اكصدامات)
UPDATE products SET category_id = '3d0e787b-dae2-4f33-979c-40ec2410ada8'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%صدام%' OR name_ar ILIKE '%اكصدام%' OR name_ar ILIKE '%بامبر%');

-- Mirrors (مرايات)
UPDATE products SET category_id = 'eae5f9d3-cc17-4448-8c8d-fe3356355782'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%مراية%' OR name_ar ILIKE '%مرايا%' OR name_ar ILIKE '%mirror%');

-- Rubber (كاوتشات)
UPDATE products SET category_id = 'b2adb095-269b-43bb-a76d-7b17861496d4'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%كاوتش%' OR name_ar ILIKE '%جلدة%' OR name_ar ILIKE '%ممتص%');

-- Fiber parts (فيبر)
UPDATE products SET category_id = '838fe9b9-8a31-42de-9e26-5e9ab92af1f5'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%فيبر%' OR name_ar ILIKE '%رفرف%' OR name_ar ILIKE '%كابوت%' OR name_ar ILIKE '%شنطة%');

-- Steering (مقود)
UPDATE products SET category_id = 'a1b2c3d4-2222-4aaa-bbbb-000000000002'
WHERE category_id IS NULL AND is_active = true
AND (name_ar ILIKE '%دركسيون%' OR name_ar ILIKE '%مقود%' OR name_ar ILIKE '%عمة%' OR name_ar ILIKE '%باور%');
