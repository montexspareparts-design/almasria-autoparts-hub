CREATE OR REPLACE FUNCTION public.phone_already_registered(_phone text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE phone IS NOT NULL
      AND right(regexp_replace(phone, '\D', '', 'g'), 10)
        = right(regexp_replace(_phone, '\D', '', 'g'), 10)
      AND length(regexp_replace(_phone, '\D', '', 'g')) >= 10
  );
$$;