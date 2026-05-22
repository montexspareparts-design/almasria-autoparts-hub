-- Table to store OTP codes for password reset via email
CREATE TABLE IF NOT EXISTS public.email_password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_email ON public.email_password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_otps_expires ON public.email_password_reset_otps(expires_at);

ALTER TABLE public.email_password_reset_otps ENABLE ROW LEVEL SECURITY;

-- No client access — only edge functions (service role) can read/write
CREATE POLICY "no_client_access" ON public.email_password_reset_otps
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
