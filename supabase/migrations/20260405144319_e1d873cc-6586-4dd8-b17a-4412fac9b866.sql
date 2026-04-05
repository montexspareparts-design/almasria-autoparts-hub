
-- Delete dependent data first (foreign key order)
DELETE FROM public.bundle_items;
DELETE FROM public.dealer_cart_items;
DELETE FROM public.dealer_favorites;
DELETE FROM public.dealer_price_views;
DELETE FROM public.dealer_quote_items;
DELETE FROM public.dealer_shopping_list_items;
DELETE FROM public.order_items;
DELETE FROM public.price_list_products;
DELETE FROM public.product_reviews;
DELETE FROM public.product_tier_prices;
DELETE FROM public.stock_alerts;
DELETE FROM public.quantity_discounts;
-- Now delete all products
DELETE FROM public.products;
