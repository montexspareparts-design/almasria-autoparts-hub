
-- Rate limiting table
CREATE TABLE public.rate_limit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No RLS needed - only accessed via SECURITY DEFINER function
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Block all client access
CREATE POLICY "No client access to rate limits"
ON public.rate_limit_logs
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Index for fast lookups
CREATE INDEX idx_rate_limit_lookup ON public.rate_limit_logs (identifier, action, created_at DESC);

-- Auto-cleanup old entries (keep last 24h)
CREATE INDEX idx_rate_limit_cleanup ON public.rate_limit_logs (created_at);

-- Rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier text,
  _action text,
  _max_requests integer,
  _window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _count integer;
  _window_start timestamptz;
BEGIN
  _window_start := now() - (_window_seconds || ' seconds')::interval;
  
  -- Count recent requests
  SELECT COUNT(*) INTO _count
  FROM public.rate_limit_logs
  WHERE identifier = _identifier
    AND action = _action
    AND created_at > _window_start;
  
  -- If over limit, reject
  IF _count >= _max_requests THEN
    RETURN false;
  END IF;
  
  -- Log this request
  INSERT INTO public.rate_limit_logs (identifier, action)
  VALUES (_identifier, _action);
  
  -- Cleanup old entries occasionally (1% chance per call)
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit_logs WHERE created_at < now() - interval '24 hours';
  END IF;
  
  RETURN true;
END;
$$;
