DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Active dealers can read legacy price list files in catalogs'
  ) THEN
    CREATE POLICY "Active dealers can read legacy price list files in catalogs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'catalogs'
      AND name LIKE 'price-lists/%'
      AND EXISTS (
        SELECT 1
        FROM public.dealer_accounts
        WHERE dealer_accounts.user_id = auth.uid()
          AND dealer_accounts.is_active = true
      )
    );
  END IF;
END;
$$;