
-- 1. Create a separate admin-only table for initial passwords
CREATE TABLE public.dealer_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_account_id uuid NOT NULL REFERENCES public.dealer_accounts(id) ON DELETE CASCADE,
  initial_password text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(dealer_account_id)
);

ALTER TABLE public.dealer_passwords ENABLE ROW LEVEL SECURITY;

-- Only admins can access this table
CREATE POLICY "Admins can manage dealer passwords"
  ON public.dealer_passwords FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Moderators can view (for support)
CREATE POLICY "Moderators can view dealer passwords"
  ON public.dealer_passwords FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

-- 2. Migrate existing data
INSERT INTO public.dealer_passwords (dealer_account_id, initial_password)
SELECT id, initial_password
FROM public.dealer_accounts
WHERE initial_password IS NOT NULL AND initial_password != '';

-- 3. Drop the column from dealer_accounts
ALTER TABLE public.dealer_accounts DROP COLUMN initial_password;
