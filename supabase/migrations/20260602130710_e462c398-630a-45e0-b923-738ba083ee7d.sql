-- ─── Sales Invoices (header) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.erp_sales_invoices (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number  TEXT NOT NULL UNIQUE,
  invoice_date    TIMESTAMPTZ NOT NULL,
  customer_code   TEXT,
  customer_name   TEXT,
  warehouse       TEXT,
  salesman        TEXT,
  payment_method  TEXT,
  total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  raw_payload     JSONB,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_erp_sales_invoices_date ON public.erp_sales_invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_erp_sales_invoices_customer ON public.erp_sales_invoices(customer_code);

GRANT SELECT ON public.erp_sales_invoices TO authenticated;
GRANT ALL ON public.erp_sales_invoices TO service_role;

ALTER TABLE public.erp_sales_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read sales invoices"
ON public.erp_sales_invoices FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ─── Sales Invoice Items (lines) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.erp_sales_invoice_items (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id      UUID REFERENCES public.erp_sales_invoices(id) ON DELETE CASCADE,
  invoice_number  TEXT NOT NULL,
  invoice_date    TIMESTAMPTZ NOT NULL,
  erp_item_code   TEXT,
  sku             TEXT,
  item_name       TEXT,
  unit            TEXT,
  quantity        NUMERIC(14,3) NOT NULL DEFAULT 0,
  unit_price      NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  raw_payload     JSONB,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_erp_sales_items_invoice ON public.erp_sales_invoice_items(invoice_number);
CREATE INDEX IF NOT EXISTS idx_erp_sales_items_code ON public.erp_sales_invoice_items(erp_item_code);
CREATE INDEX IF NOT EXISTS idx_erp_sales_items_date ON public.erp_sales_invoice_items(invoice_date DESC);

GRANT SELECT ON public.erp_sales_invoice_items TO authenticated;
GRANT ALL ON public.erp_sales_invoice_items TO service_role;

ALTER TABLE public.erp_sales_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read sales invoice items"
ON public.erp_sales_invoice_items FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));