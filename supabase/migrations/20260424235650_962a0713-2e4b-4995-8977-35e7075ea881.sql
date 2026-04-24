-- ============================================================
-- 1) Centralized normalization function for Egyptian mobile numbers
-- ============================================================
-- Output format: 11 digits starting with "01" (e.g. 01027815696)
-- Handles: +20…, 0020…, 20…, spaces, dashes, parentheses, RTL marks.
-- Returns NULL for empty input. Returns the raw cleaned digits if it
-- can't confidently identify the number as an Egyptian mobile, so
-- existing non-EG data isn't silently mangled.

CREATE OR REPLACE FUNCTION public.normalize_eg_phone(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cleaned text;
BEGIN
  IF raw IS NULL THEN
    RETURN NULL;
  END IF;

  -- strip everything except digits (drops +, spaces, dashes, parens, RTL marks, etc.)
  cleaned := regexp_replace(raw, '\D', '', 'g');

  IF cleaned = '' THEN
    RETURN NULL;
  END IF;

  -- 0020XXXXXXXXXX  -> 01XXXXXXXXX
  IF length(cleaned) = 14 AND left(cleaned, 4) = '0020' THEN
    cleaned := '0' || substr(cleaned, 5);
  -- 20XXXXXXXXXX (12 digits, country code without leading 0/+)
  ELSIF length(cleaned) = 12 AND left(cleaned, 2) = '20' THEN
    cleaned := '0' || substr(cleaned, 3);
  -- 10 digits starting with "1" (entered without leading 0)  -> prepend 0
  ELSIF length(cleaned) = 10 AND left(cleaned, 1) = '1' THEN
    cleaned := '0' || cleaned;
  END IF;

  -- Final canonical form: 11 digits starting with 01 (Egyptian mobile)
  IF length(cleaned) = 11 AND left(cleaned, 2) = '01' THEN
    RETURN cleaned;
  END IF;

  -- Couldn't confidently normalize — return cleaned digits as-is so
  -- non-Egyptian / unusual numbers aren't lost.
  RETURN cleaned;
END;
$$;

COMMENT ON FUNCTION public.normalize_eg_phone(text) IS
  'Normalizes Egyptian mobile numbers to canonical 11-digit form starting with 01. Strips +, spaces, dashes, country codes (20 / 0020). Returns cleaned digits if not a recognizable EG mobile.';

-- ============================================================
-- 2) Generic trigger functions (one per phone column name)
-- ============================================================
-- profiles.phone, leads.phone, dealer_applications.phone,
-- admin_notification_phones.phone, part_requests.phone,
-- client_account_attempts.phone
CREATE OR REPLACE FUNCTION public.normalize_phone_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := public.normalize_eg_phone(NEW.phone);
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3) Attach triggers (drop-then-create for idempotency)
-- ============================================================
DROP TRIGGER IF EXISTS trg_normalize_phone_profiles ON public.profiles;
CREATE TRIGGER trg_normalize_phone_profiles
  BEFORE INSERT OR UPDATE OF phone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.normalize_phone_column();

DROP TRIGGER IF EXISTS trg_normalize_phone_leads ON public.leads;
CREATE TRIGGER trg_normalize_phone_leads
  BEFORE INSERT OR UPDATE OF phone ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.normalize_phone_column();

DROP TRIGGER IF EXISTS trg_normalize_phone_dealer_applications ON public.dealer_applications;
CREATE TRIGGER trg_normalize_phone_dealer_applications
  BEFORE INSERT OR UPDATE OF phone ON public.dealer_applications
  FOR EACH ROW EXECUTE FUNCTION public.normalize_phone_column();

DROP TRIGGER IF EXISTS trg_normalize_phone_admin_notification_phones ON public.admin_notification_phones;
CREATE TRIGGER trg_normalize_phone_admin_notification_phones
  BEFORE INSERT OR UPDATE OF phone ON public.admin_notification_phones
  FOR EACH ROW EXECUTE FUNCTION public.normalize_phone_column();

DROP TRIGGER IF EXISTS trg_normalize_phone_part_requests ON public.part_requests;
CREATE TRIGGER trg_normalize_phone_part_requests
  BEFORE INSERT OR UPDATE OF phone ON public.part_requests
  FOR EACH ROW EXECUTE FUNCTION public.normalize_phone_column();

DROP TRIGGER IF EXISTS trg_normalize_phone_client_account_attempts ON public.client_account_attempts;
CREATE TRIGGER trg_normalize_phone_client_account_attempts
  BEFORE INSERT OR UPDATE OF phone ON public.client_account_attempts
  FOR EACH ROW EXECUTE FUNCTION public.normalize_phone_column();

-- ============================================================
-- 4) One-time backfill: normalize existing data
-- ============================================================
UPDATE public.profiles
   SET phone = public.normalize_eg_phone(phone)
 WHERE phone IS NOT NULL
   AND phone <> public.normalize_eg_phone(phone);

UPDATE public.leads
   SET phone = public.normalize_eg_phone(phone)
 WHERE phone IS NOT NULL
   AND phone <> public.normalize_eg_phone(phone);

UPDATE public.dealer_applications
   SET phone = public.normalize_eg_phone(phone)
 WHERE phone IS NOT NULL
   AND phone <> public.normalize_eg_phone(phone);

UPDATE public.admin_notification_phones
   SET phone = public.normalize_eg_phone(phone)
 WHERE phone IS NOT NULL
   AND phone <> public.normalize_eg_phone(phone);

UPDATE public.part_requests
   SET phone = public.normalize_eg_phone(phone)
 WHERE phone IS NOT NULL
   AND phone <> public.normalize_eg_phone(phone);

UPDATE public.client_account_attempts
   SET phone = public.normalize_eg_phone(phone)
 WHERE phone IS NOT NULL
   AND phone <> public.normalize_eg_phone(phone);

-- ============================================================
-- 5) Helpful indexes for fast phone lookup (post-normalization)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_phone        ON public.profiles(phone)        WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_phone           ON public.leads(phone)           WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dealer_apps_phone     ON public.dealer_applications(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_part_requests_phone   ON public.part_requests(phone)   WHERE phone IS NOT NULL;