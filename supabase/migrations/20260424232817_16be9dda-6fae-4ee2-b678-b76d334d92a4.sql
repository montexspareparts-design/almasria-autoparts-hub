-- Clean up noise visits and add server-side guard against future noise

-- 1) Delete historical noise: admin paths, preview hide-badge, internal referrers, dev paths
DELETE FROM public.page_visits
WHERE
  lower(path) LIKE '/admin%'
  OR lower(path) LIKE '/dev/%'
  OR lower(path) LIKE '/__%'
  OR lower(path) LIKE '%forcehidebadge=true%'
  OR lower(path) LIKE '%lovable_preview%'
  OR lower(referrer) LIKE '%lovableproject.com%'
  OR lower(referrer) LIKE '%lovable.dev%'
  OR lower(referrer) LIKE '%lovable.app%'
  OR lower(referrer) LIKE '%id-preview--%';

-- 2) Server-side trigger to reject noise visits even if a stale client tries to insert
CREATE OR REPLACE FUNCTION public.reject_noise_page_visits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.path IS NULL THEN
    RAISE EXCEPTION 'path is required';
  END IF;

  IF lower(NEW.path) LIKE '/admin%'
     OR lower(NEW.path) LIKE '/dev/%'
     OR lower(NEW.path) LIKE '/__%'
     OR lower(NEW.path) LIKE '%forcehidebadge=true%'
     OR lower(NEW.path) LIKE '%lovable_preview%'
     OR (NEW.referrer IS NOT NULL AND (
          lower(NEW.referrer) LIKE '%lovableproject.com%'
       OR lower(NEW.referrer) LIKE '%lovable.dev%'
       OR lower(NEW.referrer) LIKE '%lovable.app%'
       OR lower(NEW.referrer) LIKE '%id-preview--%'
     ))
  THEN
    RETURN NULL; -- silently drop
  END IF;

  -- Block staff/admin from being recorded as visitors
  IF NEW.user_id IS NOT NULL AND public.is_staff(NEW.user_id) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_noise_page_visits ON public.page_visits;
CREATE TRIGGER trg_reject_noise_page_visits
BEFORE INSERT ON public.page_visits
FOR EACH ROW EXECUTE FUNCTION public.reject_noise_page_visits();