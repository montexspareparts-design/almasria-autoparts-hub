-- Add claim columns
ALTER TABLE public.support_requests
  ADD COLUMN IF NOT EXISTS claimed_by uuid,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_support_requests_claimed_by ON public.support_requests(claimed_by);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON public.support_requests(status);

-- Allow staff to claim unclaimed requests (atomic via WHERE claimed_by IS NULL on the client)
DROP POLICY IF EXISTS "Staff can claim support requests" ON public.support_requests;
CREATE POLICY "Staff can claim support requests"
ON public.support_requests
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- Enable realtime
ALTER TABLE public.support_requests REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_requests'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_requests';
  END IF;
END $$;