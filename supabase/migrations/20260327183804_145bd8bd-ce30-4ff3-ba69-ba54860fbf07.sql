
-- Table to track customer search activity
CREATE TABLE public.customer_search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  search_query text NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  results_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_search_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all search logs
CREATE POLICY "Admins can manage search logs"
  ON public.customer_search_logs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own search logs
CREATE POLICY "Users can insert own search logs"
  ON public.customer_search_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Anonymous users can insert search logs (without user_id)
CREATE POLICY "Anon can insert search logs"
  ON public.customer_search_logs FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);
