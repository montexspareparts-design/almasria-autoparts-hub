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

    UPDATE public.products
    SET stock_quantity = _qty
    WHERE erp_item_code = _erp_id;

    IF FOUND THEN
      _updated := _updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('updated', _updated, 'total', jsonb_array_length(_items));
END;
$$;