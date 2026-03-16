
-- 1. Secure site_settings: replace open public SELECT with restricted policy
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;

CREATE POLICY "Public can view non-sensitive settings"
  ON public.site_settings FOR SELECT
  TO public
  USING (key IN ('video_youtube_id', 'hero_video_url'));

-- 2. Create public view for product_reviews that hides user_id
CREATE OR REPLACE VIEW public.product_reviews_public
WITH (security_invoker = on) AS
  SELECT id, product_id, rating, comment, reviewer_name, created_at, is_approved
  FROM public.product_reviews;

-- 3. Replace the public SELECT policy on product_reviews base table
-- Anonymous users should only access via the view
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.product_reviews;

CREATE POLICY "Authenticated users view approved reviews"
  ON public.product_reviews FOR SELECT
  TO authenticated
  USING (is_approved = true);
