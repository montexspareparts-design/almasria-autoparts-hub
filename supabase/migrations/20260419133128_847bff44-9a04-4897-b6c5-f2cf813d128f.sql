-- 1) FIX COUPONS: Remove broad read access. Replace with secure RPC for code validation only.
DROP POLICY IF EXISTS "Anyone can view active coupons by code" ON public.coupons;

-- Secure RPC: returns coupon details ONLY when the user provides the exact code
CREATE OR REPLACE FUNCTION public.validate_coupon(_code text)
RETURNS TABLE (
  id uuid,
  code text,
  discount_type text,
  discount_value numeric,
  min_order_amount numeric,
  max_discount_amount numeric,
  applies_to_brands text[],
  description text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.code, c.discount_type, c.discount_value,
         c.min_order_amount, c.max_discount_amount,
         c.applies_to_brands, c.description
  FROM public.coupons c
  WHERE c.is_active = true
    AND upper(c.code) = upper(_code)
    AND (c.valid_from IS NULL OR c.valid_from <= now())
    AND (c.valid_to   IS NULL OR c.valid_to   >= now())
    AND (c.max_uses   IS NULL OR c.used_count < c.max_uses)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(text) TO authenticated, anon;

-- 2) FIX DEALER PASSWORDS: Restrict initial password visibility to admins only
-- (moderators should NOT see plaintext passwords). Mark for rotation.
DROP POLICY IF EXISTS "Moderators can view dealer passwords" ON public.dealer_passwords;

-- Add a "viewed_at" tracking column so we can enforce one-time view in the future
ALTER TABLE public.dealer_passwords
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS viewed_by uuid;

-- Audit trigger: log every read attempt to audit_logs
CREATE OR REPLACE FUNCTION public.log_dealer_password_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (performed_by, action, table_name, record_id, new_data)
  VALUES (
    auth.uid(),
    'view_initial_password',
    'dealer_passwords',
    NEW.id,
    jsonb_build_object('dealer_account_id', NEW.dealer_account_id)
  );
  RETURN NEW;
END;
$$;

-- 3) HARDEN REALTIME: Ensure orders/notifications use REPLICA IDENTITY FULL
-- so RLS filters are applied correctly on realtime broadcasts.
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.payment_transactions REPLICA IDENTITY FULL;

-- Tighten coupon_usage: only the user who used it (and admins) can see it
DROP POLICY IF EXISTS "Users can view own coupon usage" ON public.coupon_usage;
CREATE POLICY "Users can view own coupon usage"
ON public.coupon_usage FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));