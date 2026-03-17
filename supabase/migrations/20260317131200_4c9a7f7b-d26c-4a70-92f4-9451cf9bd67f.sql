
-- Fix: Recreate view with SECURITY INVOKER to use caller's RLS context
DROP VIEW IF EXISTS public.product_reviews_public;

CREATE VIEW public.product_reviews_public
WITH (security_invoker = true)
AS
SELECT id, product_id, rating, comment, reviewer_name, created_at, is_approved
FROM public.product_reviews
WHERE is_approved = true;

GRANT SELECT ON public.product_reviews_public TO anon, authenticated;
