-- 1) Create support_requests table
CREATE TABLE public.support_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,  -- nullable for guest requests
  customer_name text,
  customer_phone text,
  request_type text NOT NULL DEFAULT 'chatbot_contact',  -- chatbot_contact, callback, urgent
  message text,
  context jsonb DEFAULT '{}'::jsonb,  -- last chat messages, current page, etc.
  status text NOT NULL DEFAULT 'pending',  -- pending, in_progress, resolved
  assigned_to uuid,  -- staff who took it
  resolved_at timestamptz,
  resolution_note text,
  source text NOT NULL DEFAULT 'chatbot',  -- chatbot, contact_form, other
  is_dealer boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_requests_status ON public.support_requests(status, created_at DESC);
CREATE INDEX idx_support_requests_user ON public.support_requests(user_id) WHERE user_id IS NOT NULL;

-- 2) Enable RLS
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- 3) RLS policies
-- Staff (admins + moderators) can manage everything
CREATE POLICY "Staff manage all support requests"
ON public.support_requests
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- Authenticated users can view their own requests
CREATE POLICY "Users view own support requests"
ON public.support_requests
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can create requests for themselves
CREATE POLICY "Users create own support requests"
ON public.support_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Anonymous users can submit requests (e.g., from chatbot before login)
CREATE POLICY "Anon create support requests"
ON public.support_requests
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- 4) Trigger to update updated_at
CREATE TRIGGER update_support_requests_updated_at
BEFORE UPDATE ON public.support_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Trigger to notify all staff when a new request arrives
CREATE OR REPLACE FUNCTION public.notify_staff_new_support_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_record RECORD;
  display_name text;
  type_label text;
BEGIN
  -- Map type to friendly Arabic label
  type_label := CASE NEW.request_type
    WHEN 'chatbot_contact' THEN '🤖 طلب تواصل من الشات بوت'
    WHEN 'callback' THEN '📞 طلب اتصال'
    WHEN 'urgent' THEN '🚨 طلب عاجل'
    ELSE '💬 طلب دعم جديد'
  END;

  display_name := COALESCE(NEW.customer_name, 'عميل');
  IF NEW.customer_phone IS NOT NULL AND NEW.customer_phone != '' THEN
    display_name := display_name || ' (' || NEW.customer_phone || ')';
  END IF;

  -- Notify all staff (admins + moderators)
  FOR staff_record IN 
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'moderator')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      staff_record.user_id,
      type_label,
      display_name || ' يطلب التواصل مع فريق الدعم. الرسالة: ' || COALESCE(LEFT(NEW.message, 200), 'بدون تفاصيل'),
      'support_request'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_support_request_notify_staff
AFTER INSERT ON public.support_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_new_support_request();

-- 6) Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_requests;