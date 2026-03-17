
-- Fix: Recreate product_reviews_public VIEW with proper filter
DROP VIEW IF EXISTS public.product_reviews_public;

CREATE VIEW public.product_reviews_public AS
SELECT id, product_id, rating, comment, reviewer_name, created_at, is_approved
FROM public.product_reviews
WHERE is_approved = true;

-- Grant access
GRANT SELECT ON public.product_reviews_public TO anon, authenticated;
