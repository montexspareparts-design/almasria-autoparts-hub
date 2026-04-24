CREATE OR REPLACE FUNCTION public.phone_already_registered(_phone text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE phone IS NOT NULL
      AND regexp_replace(phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g')
  );
$$;

GRANT EXECUTE ON FUNCTION public.phone_already_registered(text) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS profiles_phone_normalized_idx
  ON public.profiles ((regexp_replace(phone, '\D', '', 'g')))
  WHERE phone IS NOT NULL AND phone <> '';