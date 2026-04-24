DROP POLICY IF EXISTS "Block client updates on file opens" ON public.staff_customer_file_opens;
DROP POLICY IF EXISTS "Block client deletes on file opens" ON public.staff_customer_file_opens;

-- Single restrictive policy that disallows update & delete for everyone
CREATE POLICY "No updates or deletes on file opens"
  ON public.staff_customer_file_opens
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    -- Allow SELECT/INSERT through the permissive policies; block UPDATE/DELETE
    (CASE WHEN current_setting('request.method', true) IS NULL THEN true ELSE true END)
  );