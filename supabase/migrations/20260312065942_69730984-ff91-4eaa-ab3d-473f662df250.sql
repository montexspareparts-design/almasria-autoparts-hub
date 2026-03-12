DROP POLICY "Users can update own pending orders" ON public.orders;

CREATE POLICY "Users can update own pending orders"
ON public.orders FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status IN ('pending', 'confirmed', 'pending_approval'))
WITH CHECK (user_id = auth.uid());