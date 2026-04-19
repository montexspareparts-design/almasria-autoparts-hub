-- Tighten authenticated insert policy: must match their own user_id (no NULL fallback for logged-in users)
DROP POLICY "Users create own support requests" ON public.support_requests;

CREATE POLICY "Users create own support requests"
ON public.support_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());