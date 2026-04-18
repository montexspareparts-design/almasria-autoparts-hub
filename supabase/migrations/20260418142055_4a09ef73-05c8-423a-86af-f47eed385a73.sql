-- Cache table for AI-generated dealer recommendations
CREATE TABLE public.dealer_ai_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_dealer_ai_recs_user ON public.dealer_ai_recommendations(user_id);
CREATE INDEX idx_dealer_ai_recs_expires ON public.dealer_ai_recommendations(expires_at);

ALTER TABLE public.dealer_ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI recommendations"
ON public.dealer_ai_recommendations
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all AI recommendations"
ON public.dealer_ai_recommendations
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role / edge functions will write via SECURITY DEFINER context
CREATE POLICY "Service can insert AI recommendations"
ON public.dealer_ai_recommendations
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service can update AI recommendations"
ON public.dealer_ai_recommendations
FOR UPDATE TO authenticated
USING (user_id = auth.uid());