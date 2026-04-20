-- Add business_type column to dealer_accounts to store the customer category
ALTER TABLE public.dealer_accounts
ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'retail'
CHECK (business_type IN ('retail', 'corporate', 'wholesale', 'workshop'));

-- Backfill existing dealer_accounts from leads where possible (match by erp_customer_code)
UPDATE public.dealer_accounts da
SET business_type = l.client_type
FROM public.leads l
WHERE da.erp_customer_code IS NOT NULL
  AND da.erp_customer_code = l.erp_customer_code
  AND l.client_type IN ('retail', 'corporate', 'wholesale', 'workshop')
  AND da.business_type = 'retail';

-- For remaining dealer_accounts without a match, default by tier:
-- wholesale tiers → 'wholesale', retail → 'retail'
UPDATE public.dealer_accounts
SET business_type = 'wholesale'
WHERE business_type = 'retail'
  AND tier IN ('wholesale_tier1', 'wholesale_tier2')
  AND erp_customer_code IS NULL;

COMMENT ON COLUMN public.dealer_accounts.business_type IS 'Customer business category: retail (قطاعي), corporate (شركة/هيئة), wholesale (جملة), workshop (ورشة/مركز صيانة). Used to customize dealer UI.';