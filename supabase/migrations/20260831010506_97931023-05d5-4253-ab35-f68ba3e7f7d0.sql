CREATE OR REPLACE FUNCTION public.submit_visitor_lead(
  _phone text,
  _source text DEFAULT NULL,
  _first_path text DEFAULT NULL,
  _referrer text DEFAULT NULL,
  _session_key text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p text := regexp_replace(coalesce(_phone,''), '\D', '', 'g');
BEGIN
  IF p !~ '^01[0-9]{9}$' THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  -- staff members should not be recorded as visitor leads
  IF auth.uid() IS NOT NULL AND public.is_staff(auth.uid()) THEN
    RETURN;
  END IF;

  INSERT INTO public.visitor_leads (phone, source, first_path, referrer, session_key)
  VALUES (p, _source, _first_path, _referrer, _session_key)
  ON CONFLICT (phone) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_visitor_lead(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_visitor_lead(text, text, text, text, text) TO anon, authenticated;