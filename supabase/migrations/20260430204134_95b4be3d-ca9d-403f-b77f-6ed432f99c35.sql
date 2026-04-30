-- Table
CREATE TABLE public.stock_shortage_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  manual_sku TEXT,
  manual_name TEXT,
  requested_quantity INTEGER NOT NULL DEFAULT 1 CHECK (requested_quantity > 0),
  customer_user_id UUID,
  customer_note TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','sourcing','fulfilled','rejected')),
  admin_response TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (product_id IS NOT NULL OR (manual_sku IS NOT NULL AND manual_name IS NOT NULL))
);

CREATE INDEX idx_shortage_staff ON public.stock_shortage_requests(staff_user_id, created_at DESC);
CREATE INDEX idx_shortage_product ON public.stock_shortage_requests(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_shortage_status ON public.stock_shortage_requests(status, created_at DESC);

ALTER TABLE public.stock_shortage_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff insert own shortage requests" ON public.stock_shortage_requests
FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()) AND staff_user_id = auth.uid());

CREATE POLICY "Staff view own shortage requests" ON public.stock_shortage_requests
FOR SELECT TO authenticated USING (
  staff_user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role)
);

CREATE POLICY "Staff update own open requests" ON public.stock_shortage_requests
FOR UPDATE TO authenticated USING (staff_user_id = auth.uid() AND status = 'open');

CREATE POLICY "Staff delete own open requests" ON public.stock_shortage_requests
FOR DELETE TO authenticated USING (staff_user_id = auth.uid() AND status = 'open');

CREATE POLICY "Admins manage shortage requests" ON public.stock_shortage_requests
FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Moderators update shortage status" ON public.stock_shortage_requests
FOR UPDATE TO authenticated USING (has_role(auth.uid(),'moderator'::app_role));

CREATE TRIGGER trg_shortage_updated_at
BEFORE UPDATE ON public.stock_shortage_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify staff when status changes
CREATE OR REPLACE FUNCTION public.notify_staff_shortage_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _item_label text; _title text; _msg text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.product_id IS NOT NULL THEN
    SELECT name_ar || ' (' || sku || ')' INTO _item_label FROM public.products WHERE id = NEW.product_id;
  ELSE
    _item_label := COALESCE(NEW.manual_name,'') || ' (' || COALESCE(NEW.manual_sku,'') || ')';
  END IF;
  CASE NEW.status
    WHEN 'sourcing' THEN _title := '🔄 جارٍ توفير الصنف'; _msg := 'الصنف "' || _item_label || '" تحت إجراءات التوفير';
    WHEN 'fulfilled' THEN _title := '✅ تم توفير الصنف'; _msg := 'الصنف "' || _item_label || '" تم توفيره وأصبح متاح';
    WHEN 'rejected' THEN _title := '❌ تعذّر توفير الصنف'; _msg := 'الصنف "' || _item_label || '" — ' || COALESCE(NEW.admin_response,'لن يتم توفيره حالياً');
    ELSE RETURN NEW;
  END CASE;
  IF NEW.admin_response IS NOT NULL AND NEW.status <> 'rejected' THEN
    _msg := _msg || E'\n📝 ' || NEW.admin_response;
  END IF;
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (NEW.staff_user_id, _title, _msg, 'shortage_update');
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_shortage_status_notify
AFTER UPDATE ON public.stock_shortage_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_shortage_status_change();

-- Notify admins on new request
CREATE OR REPLACE FUNCTION public.notify_admins_new_shortage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _staff_name text; _item_label text; admin_id uuid;
BEGIN
  SELECT COALESCE(full_name,email,'موظف') INTO _staff_name FROM public.profiles WHERE user_id = NEW.staff_user_id LIMIT 1;
  IF NEW.product_id IS NOT NULL THEN
    SELECT name_ar || ' (' || sku || ')' INTO _item_label FROM public.products WHERE id = NEW.product_id;
  ELSE
    _item_label := COALESCE(NEW.manual_name,'') || ' (' || COALESCE(NEW.manual_sku,'') || ')';
  END IF;
  FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (admin_id, '⚠️ بلاغ صنف ناقص',
      _staff_name || ' بلّغ عن نقص: ' || _item_label || ' — كمية: ' || NEW.requested_quantity,
      'shortage_new');
  END LOOP;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_shortage_new_notify
AFTER INSERT ON public.stock_shortage_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_shortage();

-- Aggregate priority report
CREATE OR REPLACE FUNCTION public.get_shortage_priority_report(_from date DEFAULT (CURRENT_DATE - INTERVAL '30 days')::date, _to date DEFAULT CURRENT_DATE)
RETURNS TABLE(
  group_key text, product_id_text text, sku text, name_ar text,
  reports_count bigint, total_quantity bigint, unique_staff_count bigint, unique_customers_count bigint,
  open_count bigint, sourcing_count bigint, fulfilled_count bigint, rejected_count bigint,
  priority_score numeric, last_reported_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH unified AS (
    SELECT
      COALESCE(sr.product_id::text, 'manual:' || COALESCE(sr.manual_sku, sr.manual_name)) AS group_key,
      sr.product_id::text AS product_id_text,
      COALESCE(p.sku, sr.manual_sku) AS sku,
      COALESCE(p.name_ar, sr.manual_name) AS name_ar,
      sr.staff_user_id, sr.customer_user_id, sr.requested_quantity, sr.status, sr.created_at
    FROM public.stock_shortage_requests sr
    LEFT JOIN public.products p ON p.id = sr.product_id
    WHERE sr.created_at::date BETWEEN _from AND _to
  ),
  agg AS (
    SELECT
      group_key,
      MAX(product_id_text) AS product_id_text,
      MAX(sku) AS sku,
      MAX(name_ar) AS name_ar,
      COUNT(*)::bigint AS reports_count,
      SUM(requested_quantity)::bigint AS total_quantity,
      COUNT(DISTINCT staff_user_id)::bigint AS unique_staff_count,
      COUNT(DISTINCT customer_user_id) FILTER (WHERE customer_user_id IS NOT NULL)::bigint AS unique_customers_count,
      COUNT(*) FILTER (WHERE status='open')::bigint AS open_count,
      COUNT(*) FILTER (WHERE status='sourcing')::bigint AS sourcing_count,
      COUNT(*) FILTER (WHERE status='fulfilled')::bigint AS fulfilled_count,
      COUNT(*) FILTER (WHERE status='rejected')::bigint AS rejected_count,
      (COUNT(DISTINCT staff_user_id) * 5
       + COUNT(*) * 2
       + COUNT(DISTINCT customer_user_id) FILTER (WHERE customer_user_id IS NOT NULL) * 3
       + ln(SUM(requested_quantity) + 1))::numeric AS priority_score,
      MAX(created_at) AS last_reported_at
    FROM unified
    GROUP BY group_key
  )
  SELECT * FROM agg ORDER BY priority_score DESC, last_reported_at DESC;
$$;