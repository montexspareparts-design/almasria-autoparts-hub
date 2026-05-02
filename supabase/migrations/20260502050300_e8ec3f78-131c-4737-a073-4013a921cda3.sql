DROP POLICY IF EXISTS "Staff view own shortage requests" ON public.stock_shortage_requests;
DROP POLICY IF EXISTS "All staff can view all shortage requests" ON public.stock_shortage_requests;

CREATE POLICY "All staff can view all shortage requests"
ON public.stock_shortage_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'reporter'::app_role)
  OR staff_user_id = auth.uid()
);