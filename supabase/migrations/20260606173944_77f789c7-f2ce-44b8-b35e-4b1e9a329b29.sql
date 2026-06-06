DROP POLICY IF EXISTS "Staff view own badges" ON public.reporter_badges;
CREATE POLICY "Users view own badges"
  ON public.reporter_badges
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));