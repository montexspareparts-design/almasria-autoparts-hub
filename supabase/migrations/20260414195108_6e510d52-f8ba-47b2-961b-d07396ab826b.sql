
-- Update bulk_sync_stock to match by erp_item_code FIRST, then fallback to SKU
CREATE OR REPLACE FUNCTION public.bulk_sync_stock(_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _updated integer := 0;
  _item jsonb;
  _erp_id text;
  _qty numeric;
BEGIN
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    _erp_id := trim(both '"' from (_item->>'id'));
    _qty := COALESCE((_item->>'qty')::numeric, 0);

    -- Match by erp_item_code FIRST (the Faisal code)
    UPDATE public.products
    SET stock_quantity = _qty
    WHERE erp_item_code = _erp_id;

    IF FOUND THEN
      _updated := _updated + 1;
    ELSE
      -- Fallback to SKU
      UPDATE public.products
      SET stock_quantity = _qty
      WHERE sku = _erp_id;

      IF FOUND THEN
        _updated := _updated + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('updated', _updated, 'total', jsonb_array_length(_items));
END;
$$;

-- Update bulk_update_product_prices to match by erp_item_code FIRST
CREATE OR REPLACE FUNCTION public.bulk_update_product_prices(_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _updated integer := 0;
  _item jsonb;
  _erp_id text;
  _price numeric;
  _qty integer;
  _has_qty boolean;
BEGIN
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    _erp_id := trim(both '"' from (_item->>'id'));
    _price := COALESCE((_item->>'price')::numeric, 0);
    _has_qty := (_item->>'quantity') IS NOT NULL;
    _qty := COALESCE((_item->>'quantity')::integer, 0);

    IF _has_qty THEN
      -- Match by erp_item_code FIRST
      UPDATE public.products
      SET base_price = _price, stock_quantity = _qty
      WHERE erp_item_code = _erp_id;

      IF NOT FOUND THEN
        UPDATE public.products
        SET base_price = _price, stock_quantity = _qty
        WHERE sku = _erp_id;
      END IF;
    ELSE
      UPDATE public.products
      SET base_price = _price
      WHERE erp_item_code = _erp_id;

      IF NOT FOUND THEN
        UPDATE public.products
        SET base_price = _price
        WHERE sku = _erp_id;
      END IF;
    END IF;

    IF FOUND THEN
      _updated := _updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('updated', _updated, 'total', jsonb_array_length(_items));
END;
$$;

-- Update bulk_upsert_wholesale_prices to match by erp_item_code FIRST
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

    -- Match by erp_item_code FIRST
    SELECT id INTO _product_id FROM public.products WHERE erp_item_code = _erp_id LIMIT 1;
    IF _product_id IS NULL THEN
      SELECT id INTO _product_id FROM public.products WHERE sku = _erp_id LIMIT 1;
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
