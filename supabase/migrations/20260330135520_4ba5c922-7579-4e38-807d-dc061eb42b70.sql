
-- Function: notify admins when a user reaches search threshold without orders
CREATE OR REPLACE FUNCTION public.notify_admin_high_search_no_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  search_count integer;
  order_count integer;
  user_name text;
  already_notified boolean;
  admin_record RECORD;
BEGIN
  -- Only for logged-in users
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count searches by this user
  SELECT COUNT(*) INTO search_count
  FROM public.customer_search_logs
  WHERE user_id = NEW.user_id;

  -- Check thresholds: 10, 25, 50
  IF search_count NOT IN (10, 25, 50) THEN
    RETURN NEW;
  END IF;

  -- Count orders by this user
  SELECT COUNT(*) INTO order_count
  FROM public.orders
  WHERE user_id = NEW.user_id;

  -- Only notify if NO orders
  IF order_count > 0 THEN
    RETURN NEW;
  END IF;

  -- Check if we already sent this threshold notification
  SELECT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE message LIKE '%بحث ' || search_count || ' مرة%'
      AND message LIKE '%' || NEW.user_id::text || '%'
      AND type = 'conversion_opportunity'
  ) INTO already_notified;

  IF already_notified THEN
    RETURN NEW;
  END IF;

  -- Get user name
  SELECT COALESCE(full_name, email, 'مستخدم مجهول') INTO user_name
  FROM public.profiles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  -- Notify all admins
  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      admin_record.user_id,
      '🔍 فرصة تحويل — عميل يبحث بدون طلبات',
      'العميل "' || user_name || '" بحث ' || search_count || ' مرة بدون أي طلب. قد يحتاج متابعة! [user:' || NEW.user_id::text || ']',
      'conversion_opportunity'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on customer_search_logs insert
DROP TRIGGER IF EXISTS trg_notify_high_search_no_orders ON public.customer_search_logs;
CREATE TRIGGER trg_notify_high_search_no_orders
  AFTER INSERT ON public.customer_search_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_high_search_no_orders();
