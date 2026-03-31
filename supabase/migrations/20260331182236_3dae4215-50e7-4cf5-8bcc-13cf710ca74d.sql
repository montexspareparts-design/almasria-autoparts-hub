
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _date text;
  _seq int;
BEGIN
  _date := to_char(now(), 'YYYYMMDD');
  _seq := nextval('public.order_number_seq');
  RETURN 'ORD-' || _date || '-' || lpad(_seq::text, 4, '0');
END;
$$;
