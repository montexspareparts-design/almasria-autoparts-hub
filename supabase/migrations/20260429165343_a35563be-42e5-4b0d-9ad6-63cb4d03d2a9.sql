-- 1) Sections table
CREATE TABLE IF NOT EXISTS public.reporter_report_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title_ar text NOT NULL,
  icon text,
  description_ar text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_auto boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Fields table
CREATE TABLE IF NOT EXISTS public.reporter_report_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.reporter_report_sections(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label_ar text NOT NULL,
  field_type text NOT NULL DEFAULT 'number' CHECK (field_type IN ('number','text','textarea','select')),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  placeholder text,
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_auto boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, field_key)
);

CREATE INDEX IF NOT EXISTS reporter_fields_section_idx ON public.reporter_report_fields(section_id, sort_order);

-- 3) updated_at triggers
CREATE TRIGGER trg_reporter_sections_updated
BEFORE UPDATE ON public.reporter_report_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_reporter_fields_updated
BEFORE UPDATE ON public.reporter_report_fields
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) RLS
ALTER TABLE public.reporter_report_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporter_report_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reporter sections"
ON public.reporter_report_sections FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff view active reporter sections"
ON public.reporter_report_sections FOR SELECT
TO authenticated
USING (is_active = true AND is_staff(auth.uid()));

CREATE POLICY "Admins manage reporter fields"
ON public.reporter_report_fields FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff view active reporter fields"
ON public.reporter_report_fields FOR SELECT
TO authenticated
USING (is_active = true AND is_staff(auth.uid()));

-- 5) Seed: 6 sections + their fields (idempotent)
INSERT INTO public.reporter_report_sections (key, title_ar, icon, description_ar, sort_order, is_auto) VALUES
  ('production','الإنتاج','TrendingUp','بيانات تلقائية من السيستم',1,true),
  ('communication','التواصل','Phone','أرقام التواصل اليومية',2,false),
  ('conversion','التحويل','Target','تحويل العروض إلى طلبات',3,false),
  ('growth','المتابعة والنمو','RefreshCw','المتابعات والعملاء الجدد',4,false),
  ('problems','المشاكل','AlertTriangle','أكبر مشكلة قابلتك اليوم',5,false),
  ('lost','الفرص الضايعة','FileText','عملاء مهتمين ولم يُغلقوا',6,false)
ON CONFLICT (key) DO NOTHING;

-- Production (auto)
INSERT INTO public.reporter_report_fields (section_id, field_key, label_ar, field_type, sort_order, is_auto)
SELECT s.id, v.field_key, v.label_ar, 'number', v.sort_order, true
FROM public.reporter_report_sections s,
(VALUES
  ('orders_count','عدد الطلبات',1),
  ('invoices_count','عدد الفواتير',2),
  ('sales_total','إجمالي المبيعات',3)
) AS v(field_key,label_ar,sort_order)
WHERE s.key='production'
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Communication
INSERT INTO public.reporter_report_fields (section_id, field_key, label_ar, field_type, sort_order)
SELECT s.id, v.field_key, v.label_ar, 'number', v.sort_order
FROM public.reporter_report_sections s,
(VALUES
  ('calls_count','عدد المكالمات',1),
  ('whatsapp_count','عدد رسائل واتساب',2),
  ('offers_sent_count','عدد العملاء المرسل لهم عروض',3)
) AS v(field_key,label_ar,sort_order)
WHERE s.key='communication'
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Conversion
INSERT INTO public.reporter_report_fields (section_id, field_key, label_ar, field_type, sort_order)
SELECT s.id, v.field_key, v.label_ar, 'number', v.sort_order
FROM public.reporter_report_sections s,
(VALUES
  ('offers_count','عدد العروض',1),
  ('offers_converted_count','عدد العروض المتحوّلة لطلبات',2),
  ('incomplete_orders_count','عدد الطلبات غير المكتملة',3)
) AS v(field_key,label_ar,sort_order)
WHERE s.key='conversion'
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Growth
INSERT INTO public.reporter_report_fields (section_id, field_key, label_ar, field_type, sort_order)
SELECT s.id, v.field_key, v.label_ar, 'number', v.sort_order
FROM public.reporter_report_sections s,
(VALUES
  ('followups_count','عدد المتابعات',1),
  ('new_customers_count','عدد العملاء الجدد',2)
) AS v(field_key,label_ar,sort_order)
WHERE s.key='growth'
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Problems (select + textarea)
INSERT INTO public.reporter_report_fields (section_id, field_key, label_ar, field_type, options, sort_order)
SELECT s.id, 'main_problem', 'أكبر مشكلة', 'select',
  '[{"value":"price","label":"السعر"},{"value":"unavailable","label":"عدم التوافر"},{"value":"delay","label":"التأخير"},{"value":"no_response","label":"العميل لم يرد"},{"value":"system_issue","label":"مشكلة سيستم"}]'::jsonb,
  1
FROM public.reporter_report_sections s WHERE s.key='problems'
ON CONFLICT (section_id, field_key) DO NOTHING;

INSERT INTO public.reporter_report_fields (section_id, field_key, label_ar, field_type, sort_order, placeholder)
SELECT s.id, 'problem_notes', 'ملاحظات إضافية', 'textarea', 2, 'اكتب تفاصيل المشكلة (اختياري)'
FROM public.reporter_report_sections s WHERE s.key='problems'
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Lost
INSERT INTO public.reporter_report_fields (section_id, field_key, label_ar, field_type, sort_order)
SELECT s.id, 'lost_opportunities_count', 'عدد العملاء المهتمين ولم يُغلقوا', 'number', 1
FROM public.reporter_report_sections s WHERE s.key='lost'
ON CONFLICT (section_id, field_key) DO NOTHING;