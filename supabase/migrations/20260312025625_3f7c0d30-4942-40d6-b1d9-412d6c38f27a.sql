-- Allow checking for existing phone/email in dealer_applications (limited select)
CREATE POLICY "Anyone can check phone/email existence"
ON public.dealer_applications
FOR SELECT
TO anon, authenticated
USING (true);