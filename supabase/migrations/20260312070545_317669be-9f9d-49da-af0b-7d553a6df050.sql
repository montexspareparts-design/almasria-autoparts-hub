-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to notify admins on new order
CREATE OR REPLACE FUNCTION public.notify_admins_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  order_total TEXT;
BEGIN
  order_total := to_char(NEW.total_amount, 'FM999,999,999');
  
  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      admin_record.user_id,
      '🆕 طلب جديد #' || NEW.order_number,
      'طلب جديد بقيمة ' || order_total || ' ج.م — بانتظار الموافقة',
      'order'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Function to notify dealer on status change
CREATE OR REPLACE FUNCTION public.notify_dealer_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notif_title TEXT;
  notif_message TEXT;
  notif_type TEXT := 'order';
BEGIN
  -- Only fire when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'confirmed' THEN
      notif_title := '✅ تمت الموافقة على طلبك';
      notif_message := 'تم مراجعة طلبك والموافقة عليه. يرجى استكمال الدفع لبدء التجهيز (رقم الطلب: ' || NEW.order_number || ')';
    WHEN 'awaiting_payment' THEN
      notif_title := '💳 بانتظار الدفع';
      notif_message := 'تم الموافقة على طلبك، يرجى تحويل المبلغ المطلوب لاستكمال الإجراءات (رقم الطلب: ' || NEW.order_number || ')';
    WHEN 'processing' THEN
      notif_title := '✅ تم تأكيد استلام الدفع';
      notif_message := 'تم استلام الدفع بنجاح وطلبك قيد التجهيز الآن (رقم الطلب: ' || NEW.order_number || ')';
    WHEN 'ready' THEN
      notif_title := '📦 طلبك جاهز للاستلام';
      notif_message := 'طلبك جاهز! يمكنك استلامه من الفرع أو انتظار الشحن (رقم الطلب: ' || NEW.order_number || ')';
    WHEN 'shipped' THEN
      notif_title := '🚚 تم شحن طلبك';
      notif_message := 'تم شحن طلبك! يمكنك متابعة حالته (رقم الطلب: ' || NEW.order_number || ')';
    WHEN 'delivered' THEN
      notif_title := '🎉 تم تسليم طلبك';
      notif_message := 'تم تسليم طلبك بنجاح. شكراً لتعاملك معنا! (رقم الطلب: ' || NEW.order_number || ')';
    WHEN 'cancelled' THEN
      notif_title := '❌ تم إلغاء طلبك';
      notif_message := 'تم إلغاء طلبك. تواصل معنا لمزيد من التفاصيل (رقم الطلب: ' || NEW.order_number || ')';
    WHEN 'pending_approval' THEN
      notif_title := '⚠️ تعديلات على طلبك';
      notif_message := 'تم تعديل طلبك من قبل الإدارة. يرجى مراجعة التعديلات والموافقة عليها (رقم الطلب: ' || NEW.order_number || ')';
      notif_type := 'order_edit';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (NEW.user_id, notif_title, notif_message, notif_type);

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trg_notify_admins_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_order();

CREATE TRIGGER trg_notify_dealer_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dealer_status_change();