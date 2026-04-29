-- 1. جدول الإجازات للموظفين
CREATE TABLE IF NOT EXISTS public.reporter_day_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  off_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, off_date)
);

ALTER TABLE public.reporter_day_off ENABLE ROW LEVEL SECURITY;

-- الموظف يدير إجازاته
CREATE POLICY "Staff manage own day off"
ON public.reporter_day_off FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND public.is_staff(auth.uid()));

-- الأدمن يشوف ويدير الكل
CREATE POLICY "Admins view all day off"
ON public.reporter_day_off FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage day off"
ON public.reporter_day_off FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_reporter_day_off_date ON public.reporter_day_off (off_date);
CREATE INDEX IF NOT EXISTS idx_reporter_day_off_user ON public.reporter_day_off (user_id, off_date);

-- 2. جدول رسائل التحفيز (cache يومي لكل موظف)
CREATE TABLE IF NOT EXISTS public.reporter_motivational_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_date date NOT NULL DEFAULT CURRENT_DATE,
  message text NOT NULL,
  source text NOT NULL DEFAULT 'template', -- 'ai' أو 'template'
  performance_tier text, -- 'excellent' | 'good' | 'average' | 'low' | 'new'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_date)
);

ALTER TABLE public.reporter_motivational_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view own motivational messages"
ON public.reporter_motivational_messages FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins view all motivational messages"
ON public.reporter_motivational_messages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- service role هيكتب من الـ edge function؛ مفيش insert من client
CREATE INDEX IF NOT EXISTS idx_motiv_user_date ON public.reporter_motivational_messages (user_id, message_date);

-- 3. تنبيه للأدمن عند تسجيل أجازة + إنشاء notification
CREATE OR REPLACE FUNCTION public.notify_admins_day_off()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_name text;
  v_admin record;
BEGIN
  SELECT COALESCE(full_name, email, 'موظف') INTO v_staff_name
  FROM public.profiles WHERE id = NEW.user_id;

  FOR v_admin IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_admin.user_id,
      '🌴 طلب إجازة جديد',
      v_staff_name || ' سجّل إجازة يوم ' || to_char(NEW.off_date, 'YYYY-MM-DD'),
      'info'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_day_off ON public.reporter_day_off;
CREATE TRIGGER trg_notify_admins_day_off
AFTER INSERT ON public.reporter_day_off
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_day_off();