-- Create page_visits table for tracking visitor activity
CREATE TABLE public.page_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  session_key text,
  path text NOT NULL,
  page_title text,
  referrer text,
  visited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_visits_user_id ON public.page_visits(user_id, visited_at DESC);
CREATE INDEX idx_page_visits_session_key ON public.page_visits(session_key, visited_at DESC);
CREATE INDEX idx_page_visits_visited_at ON public.page_visits(visited_at DESC);

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own visits
CREATE POLICY "Users insert own page visits"
ON public.page_visits
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Anonymous visitors can insert anonymous visits (no user_id)
CREATE POLICY "Anon insert anonymous page visits"
ON public.page_visits
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Users can view their own visits
CREATE POLICY "Users view own page visits"
ON public.page_visits
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Staff (admin + moderator) can view all visits
CREATE POLICY "Staff view all page visits"
ON public.page_visits
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Block updates and deletes from clients
CREATE POLICY "Block client updates"
ON public.page_visits
FOR UPDATE
TO authenticated, anon
USING (false);

CREATE POLICY "Block client deletes"
ON public.page_visits
FOR DELETE
TO authenticated, anon
USING (false);