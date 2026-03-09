
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow anon subscriptions (for non-logged-in users)
CREATE POLICY "Allow anonymous push subscriptions"
  ON public.push_subscriptions FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);
