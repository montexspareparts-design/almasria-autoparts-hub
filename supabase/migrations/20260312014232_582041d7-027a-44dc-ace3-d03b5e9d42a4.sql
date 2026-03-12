-- Allow dealers to update their own pending orders
CREATE POLICY "Users can update own pending orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status IN ('pending', 'confirmed'))
WITH CHECK (user_id = auth.uid());

-- Allow dealers to delete their own order items (for pending orders)
CREATE POLICY "Users can delete own order items"
ON public.order_items
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM orders 
  WHERE orders.id = order_items.order_id 
  AND orders.user_id = auth.uid()
  AND orders.status IN ('pending', 'confirmed')
));

-- Allow dealers to update their own order items (for pending orders)
CREATE POLICY "Users can update own order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM orders 
  WHERE orders.id = order_items.order_id 
  AND orders.user_id = auth.uid()
  AND orders.status IN ('pending', 'confirmed')
));