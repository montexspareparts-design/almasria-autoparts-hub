CREATE OR REPLACE FUNCTION public.bulk_import_products(_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _imported integer := 0;
  _updated integer := 0;
  _skipped integer := 0;
  _item jsonb;
  _erp_id text;
  _name text;
  _price numeric;
  _qty integer;
  _existing_id uuid;
BEGIN
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    _erp_id := trim(both '"' from (_item->>'id'));
    _name := trim(both ' ' from (_item->>'name'));
    _price := COALESCE((_item->>'price')::numeric, 0);
    _qty := COALESCE((_item->>'qty')::integer, 0);

    IF _erp_id IS NULL OR _erp_id = '' OR _name IS NULL OR _name = '' THEN
      _skipped := _skipped + 1;
      CONTINUE;
    END IF;

    -- Try to find existing product by SKU or erp_item_code
    SELECT id INTO _existing_id FROM public.products WHERE sku = _erp_id LIMIT 1;
    IF _existing_id IS NULL THEN
      SELECT id INTO _existing_id FROM public.products WHERE erp_item_code = _erp_id LIMIT 1;
    END IF;

    IF _existing_id IS NOT NULL THEN
      UPDATE public.products
      SET base_price = _price, stock_quantity = _qty, name_ar = _name, is_active = true
      WHERE id = _existing_id;
      _updated := _updated + 1;
    ELSE
      BEGIN
        INSERT INTO public.products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active)
        VALUES (_erp_id, _erp_id, _name, _price, _qty, 'toyota_genuine', true);
        _imported := _imported + 1;
      EXCEPTION WHEN unique_violation THEN
        BEGIN
          INSERT INTO public.products (sku, erp_item_code, name_ar, base_price, stock_quantity, brand, is_active)
          VALUES ('ERP-' || _erp_id, _erp_id, _name, _price, _qty, 'toyota_genuine', true);
          _imported := _imported + 1;
        EXCEPTION WHEN unique_violation THEN
          _skipped := _skipped + 1;
        END;
      END;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('imported', _imported, 'updated', _updated, 'skipped', _skipped, 'total', jsonb_array_length(_items));
END;
$$;