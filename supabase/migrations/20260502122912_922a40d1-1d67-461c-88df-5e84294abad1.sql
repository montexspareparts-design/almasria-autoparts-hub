CREATE OR REPLACE FUNCTION public.notify_admins_day_off()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_staff_name text;
  v_admin record;
  v_msg text;
BEGIN
  SELECT COALESCE(full_name, email, 'موظف') INTO v_staff_name
  FROM public.profiles WHERE id = NEW.user_id;

  v_msg := COALESCE(v_staff_name, 'موظف') || ' سجّل إجازة يوم ' ||
           COALESCE(to_char(NEW.off_date, 'YYYY-MM-DD'), 'غير محدد');

  IF v_msg IS NULL OR length(trim(v_msg)) = 0 THEN
    v_msg := 'تم تسجيل إجازة جديدة';
  END IF;

  FOR v_admin IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_admin.user_id,
      '🌴 طلب إجازة جديد',
      v_msg,
      'info'
    );
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- منع كسر تسجيل الإجازة لو فشل الإشعار لأي سبب
  RETURN NEW;
END;
$function$;