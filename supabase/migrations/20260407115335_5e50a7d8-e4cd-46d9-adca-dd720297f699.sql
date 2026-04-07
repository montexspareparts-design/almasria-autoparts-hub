DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_tier_prices_product_id_tier_key'
  ) THEN
    ALTER TABLE public.product_tier_prices ADD CONSTRAINT product_tier_prices_product_id_tier_key UNIQUE (product_id, tier);
  END IF;
END $$;