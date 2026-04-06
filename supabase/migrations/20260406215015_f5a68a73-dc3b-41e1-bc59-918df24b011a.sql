INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('DTX-232-AISIN', '10503', 'اسطوانة دبرياج هاي اس 2020 1GD ياباني', 5144.48, 10, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/83d9633f-179f-47ea-a547-5232cdb9dbc6.jpg?t=1772929631658')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('CMT-005-AISIN', '12459', 'ماستر دبرياج علوي هاي لوكس 99 ياباني', 1075.4, 4, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/6f474e71-a19a-406f-8fef-0af48cc39d2e.jpg?t=1773449233191')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('CRT-107-AISIN', '14086', 'ماستر دبرياج سفلي هاي اس 2005 ياباني', 1055.45, 13, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/75b9ca95-8680-4ec2-a356-3dd92ebd9ec2.jpeg?t=1773449138227')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('CMT-142-AISIN', '14543', 'ماستر دبرياج علوي هاي اس 2005 ياباني', 1723.87, 3, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/2d8c9688-5869-4e3e-a8aa-1411b346308b.png?t=1773449216637')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('DTX-131-AISIN', '14658', 'اسطوانة دبرياج هاي اس 3L زور نحاس ياباني', 1810.3, 5, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/57aedb55-74d7-4827-80cc-e5c8a7f256d6.jpeg?t=1772929992212')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('FCT-082-AISIN', '14661', 'كلاتش مروحة هاي اس 2005 2KD ياباني', 5344.49, 4, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/462278a9-ca6a-404a-ae95-d17d72550369.jpeg?t=1773448425803')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('CMT-078-AISIN', '14699', 'ماستر دبرياج علوي كوستر 93 & هاي اس 3L ياباني', 1654.95, 35, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/aea65c7b-1d88-496c-85d0-22bbd8a6568e.jpeg?t=1773449157956')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('DT-068-AISIN', '14776', 'اسطوانة دبرياج هاي اس 94 3L كاوتش ياباني', 1891.37, 3, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/e4a4da3d-de54-430c-8de0-419cf1947c7e.jpg?t=1772930176623')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('CTX-064-AISIN', '15151', 'ديسك دبرياج هاي اس 3L ياباني', 2422.25, 5, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/b698cad9-c941-4790-94ee-8b48975b9491.jpeg?t=1773221455354')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('DTX-172-AISIN', '15456', 'اسطوانة دبرياج هاي اس 2005 2KD ياباني', 3482.99, 11, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/9c4950f1-4728-48d7-bec8-331b530c054f.jpg?t=1772928867569')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('CTX-084-AISIN', '15468', 'ديسك دبرياج كوستر 93 1HZ ياباني', 3512.54, 49, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/e1bb3ee6-c4f5-4224-aade-b60e5e113caa.png?t=1773221096560')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('CTX-149-AISIN', '15469', 'ديسك دبرياج كورولا 2008 1ZR ياباني', 2744.17, 5, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/32af6192-9f8a-482a-9d99-3834a88ee1a9.jpeg?t=1773221074624')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('DTX-133-AISIN', '15596', 'اسطوانة دبرياج كوستر 93 1HZ ياباني', 4593.32, 69, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/7330400d-c446-4718-8e04-12c83ce1cdf6.jpg?t=1772928162735')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('DTX-137-AISIN', '20358', 'اسطوانة دبرياج هاي اس & هاي لوكس & كوستر  2TR & 3RZ ياباني', 3562.14, 21, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/11a45371-acf4-41c1-948e-391d9b6049ba.jpg?t=1772928645609')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('CTX-170-AISIN', '20587', 'ديسك دبرياج هاي اس 2020 1GD ياباني', 5387.65, 3, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/c48d829d-e3f8-4b94-90d9-6d4db372c26c.png?t=1773221451863')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('CMT-141-AISIN', '21217', 'ماستر دبرياج علوي كورولا 2001 ياباني', 1615.79, 4, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/63b6870e-495b-48e2-ab74-eeed6290b0ff.webp?t=1773449144683')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('BMTS-037-AISIN', '21218', 'ماستر فرامل عمومي هاي لوكس 2005 & فورتشنر 2005 تايلاندي', 4052.93, 6, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/a782c543-0533-4f10-9b8d-b25ef2a58bb5.jpg?t=1773449342043')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('CRT-052-AISIN', '21223', 'ماستر دبرياج سفلي كورولا 2001 ياباني', 1111.0, 6, 'aisin', true, 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/storage/v1/object/public/product-images/b4bb2c52-44bf-4491-8717-8efa6868074c.png?t=1773449127128')
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active, image_url)
VALUES ('CST-043-AISIN', '21561', 'طقم دبرياج ( ديسك & اسطوانة ) كوستر 93 1HZ ياباني', 8338.06, 9, 'aisin', true, NULL)
ON CONFLICT (sku) DO UPDATE SET name_ar = EXCLUDED.name_ar, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, brand = EXCLUDED.brand, erp_item_code = EXCLUDED.erp_item_code, image_url = COALESCE(EXCLUDED.image_url, products.image_url), is_active = true;

INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 4442.3 FROM products WHERE sku = 'DTX-232-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 984.29 FROM products WHERE sku = 'CMT-005-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 1005.81 FROM products WHERE sku = 'CRT-107-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 1441.79 FROM products WHERE sku = 'CMT-142-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 1585.37 FROM products WHERE sku = 'DTX-131-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 4889.14 FROM products WHERE sku = 'FCT-082-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 1550.78 FROM products WHERE sku = 'CMT-078-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 1675.87 FROM products WHERE sku = 'DT-068-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 2314.67 FROM products WHERE sku = 'CTX-064-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 3342.95 FROM products WHERE sku = 'DTX-172-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 3059.13 FROM products WHERE sku = 'CTX-084-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 2502.77 FROM products WHERE sku = 'CTX-149-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 4250.75 FROM products WHERE sku = 'DTX-133-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 3046.17 FROM products WHERE sku = 'DTX-137-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 4889.14 FROM products WHERE sku = 'CTX-170-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 1010.83 FROM products WHERE sku = 'CMT-141-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 3678.4 FROM products WHERE sku = 'BMTS-037-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 895.0 FROM products WHERE sku = 'CRT-052-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO product_tier_prices (product_id, tier, price) SELECT id, 'wholesale_tier1', 8151.0 FROM products WHERE sku = 'CST-043-AISIN' ON CONFLICT (product_id, tier) DO UPDATE SET price = EXCLUDED.price;