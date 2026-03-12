-- First update dealer_account to point to the latest application for phone 01020412358
UPDATE public.dealer_accounts 
SET application_id = '7614d1fd-789c-4e2e-aa0d-2eb14770e100'
WHERE application_id = '3e7d2427-88b0-4d13-8022-074fd7cdf09f';

-- Now delete duplicates keeping most recent per phone
DELETE FROM public.dealer_applications
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at DESC) as rn
    FROM public.dealer_applications
  ) sub WHERE rn > 1
);

-- Add unique constraints
CREATE UNIQUE INDEX dealer_applications_phone_unique ON public.dealer_applications (phone);
CREATE UNIQUE INDEX dealer_applications_email_unique ON public.dealer_applications (email) WHERE email IS NOT NULL AND email != '';