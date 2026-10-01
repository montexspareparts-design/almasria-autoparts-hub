ALTER TABLE public.dealer_applications ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website';
UPDATE public.dealer_applications a SET source='oils_app'
  FROM auth.users u WHERE u.id=a.user_id AND u.raw_user_meta_data->>'source'='oils_app';
CREATE POLICY "Moderators can view dealer documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='dealer-documents' AND public.has_role(auth.uid(),'moderator'::public.app_role));