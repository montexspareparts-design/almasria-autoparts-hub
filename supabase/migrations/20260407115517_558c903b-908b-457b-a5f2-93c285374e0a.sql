CREATE OR REPLACE FUNCTION public.bulk_upsert_wholesale_prices(_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _updated integer := 0;
  _item jsonb;
  _erp_id text;
  _wholesale_price numeric;
  _product_id uuid;
BEGIN
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    _erp_id := trim(both '"' from (_item->>'id'));
    _wholesale_price := COALESCE((_item->>'wholesalePrice')::numeric, 0);

    IF _erp_id IS NULL OR _erp_id = '' OR _wholesale_price <= 0 THEN
      CONTINUE;
    END IF;

    -- Find product by SKU or erp_item_code
    SELECT id INTO _product_id FROM public.products WHERE sku = _erp_id LIMIT 1;
    IF _product_id IS NULL THEN
      SELECT id INTO _product_id FROM public.products WHERE erp_item_code = _erp_id LIMIT 1;
    END IF;

    IF _product_id IS NOT NULL THEN
      INSERT INTO public.product_tier_prices (product_id, tier, price)
      VALUES (_product_id, 'wholesale_tier1', _wholesale_price)
      ON CONFLICT (product_id, tier)
      DO UPDATE SET price = EXCLUDED.price;
      _updated := _updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('updated', _updated, 'total', jsonb_array_length(_items));
END;
$$;