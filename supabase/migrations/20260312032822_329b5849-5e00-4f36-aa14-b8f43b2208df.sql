-- Allow admins to upload/manage files in price-lists bucket
CREATE POLICY "Admins can manage price list files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'price-lists' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'price-lists' AND public.has_role(auth.uid(), 'admin'));

-- Allow active dealers to read price list files
CREATE POLICY "Active dealers can read price list files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'price-lists' AND EXISTS (
  SELECT 1 FROM public.dealer_accounts
  WHERE user_id = auth.uid() AND is_active = true
));