DROP POLICY IF EXISTS "Users can delete own order items" ON public.order_items;
CREATE POLICY "Users can delete own order items"
ON public.order_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
      AND orders.status IN ('pending', 'confirmed', 'awaiting_payment')
  )
);

CREATE POLICY "Users can delete own unpaid orders"
ON public.orders
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND status IN ('pending', 'confirmed', 'awaiting_payment')
);