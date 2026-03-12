
-- ERP sync logs table
CREATE TABLE public.erp_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL, -- 'quote_push', 'order_push', 'order_update', 'stock_update', 'price_update'
  direction text NOT NULL DEFAULT 'outbound', -- 'outbound' (to ERP) or 'inbound' (from ERP)
  reference_id text, -- order_id, quote_id, or product SKU
  reference_number text, -- order_number, quote_number
  payload jsonb DEFAULT '{}'::jsonb,
  response jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed', 'mock'
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.erp_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sync logs"
  ON public.erp_sync_logs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ERP config table for storing API settings
CREATE TABLE public.erp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ERP config"
  ON public.erp_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert default mock config
INSERT INTO public.erp_config (key, value) VALUES
  ('erp_base_url', 'https://alfaysalerp.com/api'),
  ('erp_mode', 'mock'),
  ('erp_api_key', ''),
  ('webhook_secret', 'whsec_mock_' || gen_random_uuid()::text);
