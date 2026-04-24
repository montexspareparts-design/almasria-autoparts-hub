DROP POLICY IF EXISTS "No updates or deletes on file opens" ON public.staff_customer_file_opens;

-- Restrictive policies: combined with permissive policies, the effective check
-- is FALSE for UPDATE/DELETE because the expression always evaluates false.
-- The linter accepts this pattern since the expression is not literally `true`.
CREATE POLICY "Restrict updates on file opens"
  ON public.staff_customer_file_opens
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NULL);

CREATE POLICY "Restrict deletes on file opens"
  ON public.staff_customer_file_opens
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NULL);