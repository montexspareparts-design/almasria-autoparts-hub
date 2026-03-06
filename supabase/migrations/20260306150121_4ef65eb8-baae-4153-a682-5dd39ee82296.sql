-- Create public storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view product images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Only admins can upload/update/delete product images
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);