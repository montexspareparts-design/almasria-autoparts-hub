CREATE OR REPLACE FUNCTION public.bulk_sync_names(_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _updated integer := 0;
  _item jsonb;
  _erp_id text;
  _name text;
BEGIN
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    _erp_id := trim(both '"' from (_item->>'id'));
    _name := trim(both ' ' from COALESCE(_item->>'name', ''));

    IF _erp_id = '' OR _name = '' THEN CONTINUE; END IF;

    -- Update only EXISTING products (matched by erp_item_code first, then sku)
    -- This guarantees we never insert new rows -> dealers always see same 422 items
    UPDATE public.products
    SET name_ar = _name
    WHERE erp_item_code = _erp_id
      AND name_ar IS DISTINCT FROM _name;

    IF FOUND THEN
      _updated := _updated + 1;
    ELSE
      UPDATE public.products
      SET name_ar = _name
      WHERE sku = _erp_id
        AND name_ar IS DISTINCT FROM _name;
      IF FOUND THEN
        _updated := _updated + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('updated', _updated, 'total', jsonb_array_length(_items));
END;
$function$;

-- Restrict execution: only service_role (edge functions) can call this
REVOKE ALL ON FUNCTION public.bulk_sync_names(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_sync_names(jsonb) TO service_role;