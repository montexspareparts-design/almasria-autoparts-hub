-- جدول أرقام الموظفين لاستقبال تنبيهات الطلبات الجديدة عبر الواتساب
CREATE TABLE IF NOT EXISTS public.admin_notification_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  notify_new_orders boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.admin_notification_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage notification phones"
  ON public.admin_notification_phones
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators view notification phones"
  ON public.admin_notification_phones
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

-- Trigger function: إرسال واتساب للأدمن عند طلب جديد
CREATE OR REPLACE FUNCTION public.notify_admin_whatsapp_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer_name text;
  _customer_phone text;
BEGIN
  SELECT full_name, phone INTO _customer_name, _customer_phone
  FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;

  PERFORM net.http_post(
    url := 'https://hcpfjhcfhfjqusbjnkfa.supabase.co/functions/v1/notify-admin-whatsapp-new-order',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'total_amount', NEW.total_amount,
      'customer_name', COALESCE(_customer_name, 'عميل'),
      'customer_phone', COALESCE(_customer_phone, ''),
      'pickup_branch', COALESCE(NEW.pickup_branch, ''),
      'shipping_governorate', COALESCE(NEW.shipping_governorate, '')
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_whatsapp_new_order ON public.orders;
CREATE TRIGGER trg_notify_admin_whatsapp_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_whatsapp_new_order();

-- إضافة عمود للطلبات لتتبع أول تواصل (لـ SLA)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS first_contacted_at timestamptz;

-- إضافة رقم الأدمن الرئيسي افتراضياً
INSERT INTO public.admin_notification_phones (phone, label, is_active)
VALUES ('201027815696', 'الأدمن الرئيسي', true)
ON CONFLICT (phone) DO NOTHING;