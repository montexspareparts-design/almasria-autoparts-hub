
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS shipping_company text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;
