
DROP POLICY IF EXISTS "Block updates and deletes" ON public.client_account_attempts;

CREATE POLICY "No updates allowed"
  ON public.client_account_attempts FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "No deletes allowed"
  ON public.client_account_attempts FOR DELETE
  TO authenticated
  USING (false);
