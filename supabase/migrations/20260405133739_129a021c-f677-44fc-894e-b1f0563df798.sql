ALTER TABLE products ADD COLUMN erp_item_code text;
CREATE INDEX idx_products_erp_item_code ON products(erp_item_code) WHERE erp_item_code IS NOT NULL;