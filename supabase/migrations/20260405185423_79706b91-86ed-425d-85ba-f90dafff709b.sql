
CREATE OR REPLACE FUNCTION public.notify_dealer_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  notif_title TEXT;
  notif_message TEXT;
  notif_type TEXT := 'order';
  tracking_info TEXT := '';
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Build tracking info string
  IF NEW.shipping_company IS NOT NULL AND NEW.shipping_company != '' THEN
    tracking_info := tracking_info || E'\nشركة الشحن: ' || NEW.shipping_company;
  END IF;
  IF NEW.tracking_number IS NOT NULL AND NEW.tracking_number != '' THEN
    tracking_info := tracking_info || E'\nرقم البوليصة: ' || NEW.tracking_number;
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
      notif_message := 'تم شحن طلبك! يمكنك متابعة حالته (رقم الطلب: ' || NEW.order_number || ')' || tracking_info;
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
$function$;
