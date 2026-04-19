ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pickup_branch text;

COMMENT ON COLUMN public.orders.pickup_branch IS 'فرع الاستلام: ossim | luxor | tawfiqia';