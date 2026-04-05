-- Allow reading max_order_percentage setting
DROP POLICY IF EXISTS "Public can view non-sensitive settings" ON public.site_settings;
CREATE POLICY "Public can view non-sensitive settings"
ON public.site_settings FOR SELECT TO public
USING (key IN ('video_youtube_id', 'hero_video_url', 'max_order_percentage'));

-- Update trigger to read percentage from site_settings
CREATE OR REPLACE FUNCTION public.enforce_order_item_prices()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _base_price numeric;
  _sale_price numeric;
  _is_on_sale boolean;
  _tier customer_tier;
  _tier_price numeric;
  _final_price numeric;
  _stock_quantity integer;
  _safety_stock integer;
  _max_order_cap integer;
  _available_qty integer;
  _max_pct integer;
  _pct_cap integer;
  _effective_max integer;
BEGIN
  -- Get product pricing and stock info
  SELECT base_price, sale_price, is_on_sale, stock_quantity, safety_stock, max_order_cap
  INTO _base_price, _sale_price, _is_on_sale, _stock_quantity, _safety_stock, _max_order_cap
  FROM public.products
  WHERE id = NEW.product_id AND is_active = true;

  IF _base_price IS NULL THEN
    RAISE EXCEPTION 'Product not found or inactive';
  END IF;

  -- Read max order percentage from site_settings (default 50)
  SELECT COALESCE(value::integer, 50) INTO _max_pct
  FROM public.site_settings WHERE key = 'max_order_percentage';
  IF _max_pct IS NULL THEN _max_pct := 50; END IF;

  -- Safety Stock check: available = stock - safety_stock
  _available_qty := GREATEST(0, _stock_quantity - COALESCE(_safety_stock, 0));

  -- Percentage cap rule
  _pct_cap := GREATEST(1, floor(_available_qty * _max_pct / 100.0)::integer);
  _effective_max := _pct_cap;

  -- Apply max_order_cap if set
  IF _max_order_cap IS NOT NULL THEN
    _effective_max := LEAST(_effective_max, _max_order_cap);
  END IF;

  IF NEW.quantity > _effective_max THEN
    RAISE EXCEPTION 'الكمية المطلوبة (%) تتجاوز الحد المسموح (%). المتاح: %، الحد %٪: %', 
      NEW.quantity, _effective_max, _available_qty, _max_pct, _pct_cap;
  END IF;

  -- Check if user is a dealer with a tier
  SELECT da.tier INTO _tier
  FROM public.dealer_accounts da
  WHERE da.user_id = (
    SELECT o.user_id FROM public.orders o WHERE o.id = NEW.order_id
  ) AND da.is_active = true;

  -- Get tier-specific price if available
  IF _tier IS NOT NULL THEN
    SELECT ptp.price INTO _tier_price
    FROM public.product_tier_prices ptp
    WHERE ptp.product_id = NEW.product_id AND ptp.tier = _tier;
  END IF;

  -- Determine final unit price: tier price > sale price > base price
  IF _tier_price IS NOT NULL THEN
    _final_price := _tier_price;
  ELSIF _is_on_sale AND _sale_price IS NOT NULL THEN
    _final_price := _sale_price;
  ELSE
    _final_price := _base_price;
  END IF;

  -- Override client-sent values
  NEW.unit_price := _final_price;
  NEW.total_price := _final_price * NEW.quantity;

  RETURN NEW;
END;
$function$;