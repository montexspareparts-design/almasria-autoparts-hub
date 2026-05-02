-- 1. تنظيف السجلات القديمة من visitor_session_views حيث الـ customer_user_id فعلياً موظف
DELETE FROM public.visitor_session_views
WHERE customer_user_id IN (
  SELECT user_id FROM public.user_roles WHERE role IN ('admin','moderator','reporter')
);

-- 2. trigger يمنع تسجيل أي موظف كـ "عميل مشاهَد" مستقبلاً
CREATE OR REPLACE FUNCTION public.prevent_staff_as_viewed_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- لو الـ customer_user_id فعلياً موظف، تجاهل الإدخال (الموظفين مش عملاء)
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.customer_user_id 
      AND role IN ('admin','moderator','reporter')
  ) THEN
    RETURN NULL; -- إلغاء الإدخال بدون رفع خطأ
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_staff_as_viewed_customer ON public.visitor_session_views;
CREATE TRIGGER trg_prevent_staff_as_viewed_customer
BEFORE INSERT OR UPDATE ON public.visitor_session_views
FOR EACH ROW
EXECUTE FUNCTION public.prevent_staff_as_viewed_customer();

-- 3. نفس الحماية على staff_customer_file_opens (احتياط)
CREATE OR REPLACE FUNCTION public.prevent_staff_as_opened_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.customer_user_id 
      AND role IN ('admin','moderator','reporter')
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_staff_as_opened_customer ON public.staff_customer_file_opens;
CREATE TRIGGER trg_prevent_staff_as_opened_customer
BEFORE INSERT OR UPDATE ON public.staff_customer_file_opens
FOR EACH ROW
EXECUTE FUNCTION public.prevent_staff_as_opened_customer();