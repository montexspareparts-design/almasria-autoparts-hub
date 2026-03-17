
-- Fix: Restrict product_reviews SELECT policy so authenticated users only see their own reviews + approved reviews without user_id exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users view approved reviews" ON public.product_reviews;

-- Recreate: authenticated users can only see approved reviews (same as public view, no user_id leak beyond own)
CREATE POLICY "Authenticated users view approved reviews"
ON public.product_reviews
FOR SELECT
TO authenticated
USING (is_approved = true AND user_id = auth.uid());

-- The "Users can view own reviews" policy already exists and covers seeing own reviews
-- The product_reviews_public VIEW is the correct way to read approved reviews publicly (without user_id)
