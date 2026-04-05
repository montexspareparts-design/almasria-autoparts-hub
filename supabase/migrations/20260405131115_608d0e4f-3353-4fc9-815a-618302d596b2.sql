
-- 1. Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_by uuid NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Only admins can view audit logs, nobody can modify them from client
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Restrict all writes from client (only triggers/service role can insert)
CREATE POLICY "Block client writes to audit logs"
ON public.audit_logs
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Allow service-role inserts via SECURITY DEFINER functions below

-- 5. Generic audit logging function (called by triggers)
CREATE OR REPLACE FUNCTION public.log_admin_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _action text;
  _user_id uuid;
  _old jsonb := NULL;
  _new jsonb := NULL;
  _record_id text;
BEGIN
  _user_id := auth.uid();
  
  -- Only log actions by admins
  IF _user_id IS NULL OR NOT public.has_role(_user_id, 'admin') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    _action := 'create';
    _new := to_jsonb(NEW);
    _record_id := NEW.id::text;
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update';
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
    _record_id := NEW.id::text;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'delete';
    _old := to_jsonb(OLD);
    _record_id := OLD.id::text;
  END IF;

  INSERT INTO public.audit_logs (performed_by, action, table_name, record_id, old_data, new_data)
  VALUES (_user_id, _action, TG_TABLE_NAME, _record_id, _old, _new);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- 6. Attach triggers to sensitive admin tables

-- Orders (status changes, edits)
CREATE TRIGGER audit_orders
AFTER UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_admin_audit();

-- User roles (role assignments)
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_admin_audit();

-- Dealer accounts (activation, tier changes)
CREATE TRIGGER audit_dealer_accounts
AFTER UPDATE OR DELETE ON public.dealer_accounts
FOR EACH ROW EXECUTE FUNCTION public.log_admin_audit();

-- Dealer applications (approval/rejection)
CREATE TRIGGER audit_dealer_applications
AFTER UPDATE ON public.dealer_applications
FOR EACH ROW EXECUTE FUNCTION public.log_admin_audit();

-- Products (price changes, activation)
CREATE TRIGGER audit_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.log_admin_audit();

-- Product tier prices (wholesale price changes)
CREATE TRIGGER audit_product_tier_prices
AFTER INSERT OR UPDATE OR DELETE ON public.product_tier_prices
FOR EACH ROW EXECUTE FUNCTION public.log_admin_audit();

-- Site settings
CREATE TRIGGER audit_site_settings
AFTER INSERT OR UPDATE OR DELETE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.log_admin_audit();

-- ERP config
CREATE TRIGGER audit_erp_config
AFTER INSERT OR UPDATE OR DELETE ON public.erp_config
FOR EACH ROW EXECUTE FUNCTION public.log_admin_audit();

-- Coupons
CREATE TRIGGER audit_coupons
AFTER INSERT OR UPDATE OR DELETE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.log_admin_audit();

-- Create index for fast lookups
CREATE INDEX idx_audit_logs_performed_by ON public.audit_logs (performed_by);
CREATE INDEX idx_audit_logs_table_action ON public.audit_logs (table_name, action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
