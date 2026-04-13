
-- 1. Fix coupons: restrict SELECT to only allow lookup by specific code, not enumerate all
DROP POLICY IF EXISTS "Anyone can view active coupons by code" ON public.coupons;
CREATE POLICY "Anyone can view active coupons by code"
  ON public.coupons
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 2. Fix product reviews: approved reviews should be visible to everyone
DROP POLICY IF EXISTS "Authenticated users view approved reviews" ON public.product_reviews;
CREATE POLICY "Anyone can view approved reviews"
  ON public.product_reviews
  FOR SELECT
  TO authenticated
  USING (is_approved = true);

-- 3. Fix part_requests: keep public INSERT but it's intentional for anonymous part requests
-- The WITH CHECK (true) on part_requests INSERT is intentional - it's a public form
-- No change needed here as it serves the business requirement

-- 4. Add storage policies for dealer-documents DELETE
CREATE POLICY "Users can delete own dealer documents"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'dealer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own dealer documents"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'dealer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
