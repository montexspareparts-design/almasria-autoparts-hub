CREATE OR REPLACE FUNCTION public.notify_on_reporter_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_id uuid;
  staff_label text;
BEGIN
  IF NEW.is_submitted = true AND (OLD.is_submitted IS DISTINCT FROM true) THEN
    SELECT COALESCE(p.full_name, p.email, 'موظف الفيصل') INTO staff_label
    FROM public.profiles p WHERE p.user_id = NEW.user_id LIMIT 1;

    FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        admin_id,
        '📋 تقرير الفيصل اليومي',
        COALESCE(staff_label, 'موظف') || ' سلّم تقرير ' || to_char(NEW.report_date, 'YYYY-MM-DD') ||
        ' — عروض: ' || NEW.quotations_count || ' / مكالمات: ' || NEW.calls_count ||
        ' / محولة: ' || NEW.offers_converted_count,
        'reporter_report'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;