CREATE OR REPLACE FUNCTION public.prevent_customer_order_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- يُسمح بتعديل الإجمالي فقط من داخل دوال الخصم الموثوقة
  IF COALESCE(current_setting('app.trusted_order_update', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'You are not allowed to modify order status';
  END IF;

  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    RAISE EXCEPTION 'You are not allowed to modify order total';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_oils_coupon(_order_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _order public.orders%ROWTYPE;
  _coupon public.coupons%ROWTYPE;
  _items_total numeric;
  _discount numeric;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO _order FROM public.orders WHERE id = _order_id;
  IF _order.id IS NULL OR _order.user_id <> _uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_not_found');
  END IF;
  IF _order.status NOT IN ('awaiting_payment', 'pending') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_locked');
  END IF;
  IF COALESCE(_order.coupon_discount, 0) > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_applied');
  END IF;

  SELECT * INTO _coupon FROM public.coupons
  WHERE upper(code) = upper(btrim(_code)) AND is_active = true
  LIMIT 1;

  IF _coupon.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;
  IF _coupon.valid_from IS NOT NULL AND now() < _coupon.valid_from THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_started');
  END IF;
  IF _coupon.valid_to IS NOT NULL AND now() > _coupon.valid_to THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  IF _coupon.max_uses IS NOT NULL AND _coupon.used_count >= _coupon.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'exhausted');
  END IF;

  SELECT COALESCE(SUM(total_price), 0) INTO _items_total
  FROM public.order_items WHERE order_id = _order_id;

  IF _coupon.min_order_amount IS NOT NULL AND _items_total < _coupon.min_order_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'min_order', 'min_order_amount', _coupon.min_order_amount);
  END IF;

  IF _coupon.discount_type = 'percent' THEN
    _discount := _items_total * (_coupon.discount_value / 100.0);
  ELSE
    _discount := _coupon.discount_value;
  END IF;

  IF _coupon.max_discount_amount IS NOT NULL THEN
    _discount := LEAST(_discount, _coupon.max_discount_amount);
  END IF;
  _discount := ROUND(GREATEST(0, LEAST(_discount, _items_total)), 2);

  PERFORM set_config('app.trusted_order_update', 'on', true);

  UPDATE public.orders
  SET coupon_code = upper(btrim(_code)),
      coupon_discount = _discount,
      total_amount = GREATEST(0, _items_total - _discount),
      updated_at = now()
  WHERE id = _order_id;

  PERFORM set_config('app.trusted_order_update', 'off', true);

  INSERT INTO public.coupon_usage (coupon_id, user_id, order_id, discount_applied)
  VALUES (_coupon.id, _uid, _order_id, _discount);

  UPDATE public.coupons SET used_count = used_count + 1, updated_at = now() WHERE id = _coupon.id;

  RETURN jsonb_build_object('ok', true, 'discount', _discount, 'total', GREATEST(0, _items_total - _discount));
END;
$$;