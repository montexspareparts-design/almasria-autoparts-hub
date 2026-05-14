
-- ============= 1) Purchase Invoices (for Moving Average Cost) =============
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  supplier_name TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  sku TEXT,                         -- fallback if product not yet in catalog
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pii_product ON public.purchase_invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_pii_sku ON public.purchase_invoice_items(sku);
CREATE INDEX IF NOT EXISTS idx_pi_date ON public.purchase_invoices(invoice_date DESC);

ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access purchase_invoices"
ON public.purchase_invoices FOR ALL
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Staff can read purchase_invoices"
ON public.purchase_invoices FOR SELECT
USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin full access purchase_invoice_items"
ON public.purchase_invoice_items FOR ALL
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Staff can read purchase_invoice_items"
ON public.purchase_invoice_items FOR SELECT
USING (public.is_staff(auth.uid()));

CREATE TRIGGER trg_pi_updated_at BEFORE UPDATE ON public.purchase_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= 2) Order Returns =============
CREATE TABLE IF NOT EXISTS public.order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  refund_amount NUMERIC NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
  reason TEXT,
  returned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_or_order ON public.order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_or_product ON public.order_returns(product_id);
CREATE INDEX IF NOT EXISTS idx_or_date ON public.order_returns(returned_at DESC);

ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access order_returns"
ON public.order_returns FOR ALL
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Staff can read order_returns"
ON public.order_returns FOR SELECT
USING (public.is_staff(auth.uid()));

-- ============= 3) Add shipping_cost + staff link to orders =============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by_staff_id UUID;

CREATE INDEX IF NOT EXISTS idx_orders_staff ON public.orders(created_by_staff_id);

-- ============= 4) Moving Average Cost view =============
-- Per-product avg cost = SUM(qty*unit_cost) / SUM(qty) across all purchase invoices.
CREATE OR REPLACE VIEW public.product_moving_avg_cost AS
SELECT
  COALESCE(p.id, pr.id) AS product_id,
  COALESCE(pii.sku, p.sku) AS sku,
  SUM(pii.quantity * pii.unit_cost) / NULLIF(SUM(pii.quantity), 0) AS avg_cost,
  SUM(pii.quantity) AS total_qty_purchased,
  MAX(pi.invoice_date) AS last_purchase_date,
  COUNT(DISTINCT pi.id) AS invoices_count
FROM public.purchase_invoice_items pii
JOIN public.purchase_invoices pi ON pi.id = pii.invoice_id
LEFT JOIN public.products p ON p.id = pii.product_id
LEFT JOIN public.products pr ON pr.sku = pii.sku
GROUP BY COALESCE(p.id, pr.id), COALESCE(pii.sku, p.sku);

GRANT SELECT ON public.product_moving_avg_cost TO authenticated;

-- ============= 5) Real Profit Intelligence RPC =============
CREATE OR REPLACE FUNCTION public.get_real_profit_intelligence(period_days INT DEFAULT 90)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  cutoff TIMESTAMPTZ := now() - (period_days || ' days')::interval;
BEGIN
  -- Authorize: admin only
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  WITH costs AS (
    SELECT product_id, avg_cost FROM public.product_moving_avg_cost WHERE product_id IS NOT NULL
  ),
  -- Line-level profitability
  lines AS (
    SELECT
      o.id AS order_id,
      o.user_id,
      o.created_at,
      o.pickup_branch AS branch,
      o.created_by_staff_id AS staff_id,
      o.coupon_discount,
      o.shipping_cost,
      o.total_amount AS order_total,
      oi.id AS item_id,
      oi.product_id,
      oi.quantity,
      oi.unit_price,
      oi.total_price,
      p.brand,
      p.name_ar,
      p.sku,
      p.base_price,
      c.avg_cost,
      -- COGS for this line (NULL if no cost data)
      (oi.quantity * c.avg_cost) AS line_cogs,
      -- Discount value at line level (proxy)
      GREATEST(0, (COALESCE(p.base_price, oi.unit_price) - oi.unit_price) * oi.quantity) AS line_discount,
      -- Returns for this line
      COALESCE((
        SELECT SUM(r.refund_amount) FROM public.order_returns r
        WHERE r.order_item_id = oi.id
      ), 0) AS line_returns,
      COALESCE((
        SELECT SUM(r.quantity * c.avg_cost) FROM public.order_returns r
        WHERE r.order_item_id = oi.id
      ), 0) AS line_returns_cogs
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    LEFT JOIN public.products p ON p.id = oi.product_id
    LEFT JOIN costs c ON c.product_id = oi.product_id
    WHERE o.status NOT IN ('cancelled','pending_payment')
      AND o.created_at >= cutoff
  ),
  -- Allocate order-level shipping/coupon proportionally to line revenue
  lines_alloc AS (
    SELECT l.*,
      CASE WHEN SUM(l.total_price) OVER (PARTITION BY l.order_id) > 0
           THEN l.coupon_discount * l.total_price / SUM(l.total_price) OVER (PARTITION BY l.order_id)
           ELSE 0 END AS alloc_coupon,
      CASE WHEN SUM(l.total_price) OVER (PARTITION BY l.order_id) > 0
           THEN l.shipping_cost * l.total_price / SUM(l.total_price) OVER (PARTITION BY l.order_id)
           ELSE 0 END AS alloc_shipping
    FROM lines l
  ),
  enriched AS (
    SELECT *,
      (total_price - line_returns - alloc_coupon) AS net_revenue,
      (line_cogs - line_returns_cogs) AS net_cogs,
      (total_price - line_returns - alloc_coupon - COALESCE(line_cogs - line_returns_cogs,0) - alloc_shipping) AS net_profit
    FROM lines_alloc
  ),
  -- Determine sale type (wholesale vs retail) based on dealer/retail user role
  enriched_typed AS (
    SELECT e.*,
      CASE WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = e.user_id AND ur.role::text IN ('dealer','wholesale_tier1','wholesale_tier2'))
           THEN 'wholesale' ELSE 'retail' END AS sale_type
    FROM enriched e
  )
  SELECT jsonb_build_object(
    'period_days', period_days,
    'cost_coverage', (
      SELECT jsonb_build_object(
        'total_lines', COUNT(*),
        'lines_with_cost', COUNT(*) FILTER (WHERE avg_cost IS NOT NULL),
        'coverage_pct', ROUND(100.0 * COUNT(*) FILTER (WHERE avg_cost IS NOT NULL) / NULLIF(COUNT(*),0), 1)
      ) FROM enriched_typed
    ),
    'totals', (
      SELECT jsonb_build_object(
        'gross_revenue', COALESCE(SUM(total_price),0),
        'returns_value', COALESCE(SUM(line_returns),0),
        'discounts_value', COALESCE(SUM(line_discount),0),
        'coupons_value', COALESCE(SUM(alloc_coupon),0),
        'shipping_cost', COALESCE(SUM(alloc_shipping),0),
        'cogs', COALESCE(SUM(line_cogs - line_returns_cogs),0),
        'net_revenue', COALESCE(SUM(net_revenue),0),
        'net_profit', COALESCE(SUM(net_profit),0),
        'net_margin_pct', CASE WHEN SUM(net_revenue) > 0 THEN ROUND(100.0 * SUM(net_profit) / SUM(net_revenue), 2) ELSE 0 END
      ) FROM enriched_typed
    ),
    'by_product', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) FROM (
        SELECT product_id, sku, name_ar, brand,
          SUM(quantity)::int AS qty_sold,
          ROUND(SUM(net_revenue)::numeric,2) AS net_revenue,
          ROUND(SUM(net_profit)::numeric,2) AS net_profit,
          CASE WHEN SUM(net_revenue) > 0 THEN ROUND(100.0 * SUM(net_profit)/SUM(net_revenue),2) ELSE NULL END AS net_margin_pct,
          ROUND(AVG(avg_cost)::numeric,2) AS avg_cost
        FROM enriched_typed
        WHERE product_id IS NOT NULL
        GROUP BY product_id, sku, name_ar, brand
        ORDER BY SUM(net_profit) DESC NULLS LAST
        LIMIT 100
      ) t
    ),
    'by_customer', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) FROM (
        SELECT e.user_id,
          COALESCE(pr.full_name, pr.email, e.user_id::text) AS customer,
          ROUND(SUM(e.net_revenue)::numeric,2) AS net_revenue,
          ROUND(SUM(e.net_profit)::numeric,2) AS net_profit,
          CASE WHEN SUM(e.net_revenue) > 0 THEN ROUND(100.0 * SUM(e.net_profit)/SUM(e.net_revenue),2) ELSE NULL END AS net_margin_pct,
          COUNT(DISTINCT e.order_id) AS orders_count
        FROM enriched_typed e
        LEFT JOIN public.profiles pr ON pr.user_id = e.user_id
        GROUP BY e.user_id, pr.full_name, pr.email
        ORDER BY SUM(e.net_profit) DESC NULLS LAST
        LIMIT 50
      ) t
    ),
    'by_brand', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) FROM (
        SELECT brand::text AS brand,
          ROUND(SUM(net_revenue)::numeric,2) AS net_revenue,
          ROUND(SUM(net_profit)::numeric,2) AS net_profit,
          CASE WHEN SUM(net_revenue) > 0 THEN ROUND(100.0 * SUM(net_profit)/SUM(net_revenue),2) ELSE NULL END AS net_margin_pct
        FROM enriched_typed
        WHERE brand IS NOT NULL
        GROUP BY brand
        ORDER BY SUM(net_profit) DESC NULLS LAST
      ) t
    ),
    'by_branch', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) FROM (
        SELECT COALESCE(branch,'بدون فرع') AS branch,
          ROUND(SUM(net_revenue)::numeric,2) AS net_revenue,
          ROUND(SUM(net_profit)::numeric,2) AS net_profit,
          CASE WHEN SUM(net_revenue) > 0 THEN ROUND(100.0 * SUM(net_profit)/SUM(net_revenue),2) ELSE NULL END AS net_margin_pct,
          COUNT(DISTINCT order_id) AS orders_count
        FROM enriched_typed
        GROUP BY branch
        ORDER BY SUM(net_profit) DESC NULLS LAST
      ) t
    ),
    'by_staff', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) FROM (
        SELECT e.staff_id,
          COALESCE(pr.full_name, pr.email, 'غير محدد') AS staff_name,
          ROUND(SUM(e.net_revenue)::numeric,2) AS net_revenue,
          ROUND(SUM(e.net_profit)::numeric,2) AS net_profit,
          CASE WHEN SUM(e.net_revenue) > 0 THEN ROUND(100.0 * SUM(e.net_profit)/SUM(e.net_revenue),2) ELSE NULL END AS net_margin_pct,
          COUNT(DISTINCT e.order_id) AS orders_count
        FROM enriched_typed e
        LEFT JOIN public.profiles pr ON pr.user_id = e.staff_id
        WHERE e.staff_id IS NOT NULL
        GROUP BY e.staff_id, pr.full_name, pr.email
        ORDER BY SUM(e.net_profit) DESC NULLS LAST
      ) t
    ),
    'by_sale_type', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) FROM (
        SELECT sale_type,
          ROUND(SUM(net_revenue)::numeric,2) AS net_revenue,
          ROUND(SUM(net_profit)::numeric,2) AS net_profit,
          CASE WHEN SUM(net_revenue) > 0 THEN ROUND(100.0 * SUM(net_profit)/SUM(net_revenue),2) ELSE NULL END AS net_margin_pct
        FROM enriched_typed
        GROUP BY sale_type
      ) t
    ),
    -- ===== Profit Leakage Detection =====
    'leakage', jsonb_build_object(
      'lossy_customers', (
        SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) FROM (
          SELECT e.user_id,
            COALESCE(pr.full_name, pr.email, e.user_id::text) AS customer,
            ROUND(SUM(e.net_revenue)::numeric,2) AS net_revenue,
            ROUND(SUM(e.net_profit)::numeric,2) AS net_profit,
            ROUND(100.0 * SUM(e.net_profit)/NULLIF(SUM(e.net_revenue),0),2) AS net_margin_pct
          FROM enriched_typed e
          LEFT JOIN public.profiles pr ON pr.user_id = e.user_id
          GROUP BY e.user_id, pr.full_name, pr.email
          HAVING SUM(e.net_revenue) > 1000 AND (SUM(e.net_profit)/NULLIF(SUM(e.net_revenue),0)) < 0.05
          ORDER BY SUM(e.net_profit) ASC
          LIMIT 20
        ) t
      ),
      'negative_margin_items', (
        SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) FROM (
          SELECT product_id, sku, name_ar, brand::text AS brand,
            SUM(quantity)::int AS qty_sold,
            ROUND(SUM(net_profit)::numeric,2) AS net_profit,
            ROUND(AVG(avg_cost)::numeric,2) AS avg_cost,
            ROUND(AVG(unit_price)::numeric,2) AS avg_sell_price
          FROM enriched_typed
          WHERE product_id IS NOT NULL AND avg_cost IS NOT NULL
          GROUP BY product_id, sku, name_ar, brand
          HAVING SUM(net_profit) < 0
          ORDER BY SUM(net_profit) ASC
          LIMIT 30
        ) t
      ),
      'killer_discounts', (
        SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) FROM (
          SELECT product_id, sku, name_ar,
            ROUND(SUM(line_discount)::numeric,2) AS total_discount,
            ROUND(SUM(net_profit)::numeric,2) AS net_profit,
            ROUND(100.0 * SUM(line_discount)/NULLIF(SUM(total_price),0),2) AS discount_pct
          FROM enriched_typed
          WHERE product_id IS NOT NULL
          GROUP BY product_id, sku, name_ar
          HAVING SUM(line_discount) > 500 AND SUM(line_discount) > SUM(net_profit)
          ORDER BY SUM(line_discount) DESC
          LIMIT 20
        ) t
      ),
      'low_branches', (
        SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) FROM (
          SELECT COALESCE(branch,'بدون فرع') AS branch,
            ROUND(SUM(net_revenue)::numeric,2) AS net_revenue,
            ROUND(SUM(net_profit)::numeric,2) AS net_profit,
            ROUND(100.0 * SUM(net_profit)/NULLIF(SUM(net_revenue),0),2) AS net_margin_pct
          FROM enriched_typed
          GROUP BY branch
          HAVING SUM(net_revenue) > 0 AND (SUM(net_profit)/NULLIF(SUM(net_revenue),0)) < 0.10
          ORDER BY (SUM(net_profit)/NULLIF(SUM(net_revenue),0)) ASC
          LIMIT 10
        ) t
      ),
      'low_staff', (
        SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) FROM (
          SELECT e.staff_id,
            COALESCE(pr.full_name, pr.email, 'غير محدد') AS staff_name,
            ROUND(SUM(e.net_revenue)::numeric,2) AS net_revenue,
            ROUND(SUM(e.net_profit)::numeric,2) AS net_profit,
            ROUND(100.0 * SUM(e.net_profit)/NULLIF(SUM(e.net_revenue),0),2) AS net_margin_pct
          FROM enriched_typed e
          LEFT JOIN public.profiles pr ON pr.user_id = e.staff_id
          WHERE e.staff_id IS NOT NULL
          GROUP BY e.staff_id, pr.full_name, pr.email
          HAVING SUM(e.net_revenue) > 0 AND (SUM(e.net_profit)/NULLIF(SUM(e.net_revenue),0)) < 0.10
          ORDER BY (SUM(e.net_profit)/NULLIF(SUM(e.net_revenue),0)) ASC
          LIMIT 10
        ) t
      )
    )
  ) INTO result
  FROM enriched_typed;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_real_profit_intelligence(INT) TO authenticated;
