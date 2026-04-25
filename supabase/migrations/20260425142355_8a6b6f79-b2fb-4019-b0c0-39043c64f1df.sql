
-- Create permission_requests table
CREATE TABLE public.permission_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  requester_name TEXT,
  requester_email TEXT,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  context_data JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.permission_requests ENABLE ROW LEVEL SECURITY;

-- Staff can create requests for themselves
CREATE POLICY "Staff create own permission requests"
ON public.permission_requests
FOR INSERT
TO authenticated
WITH CHECK (is_staff(auth.uid()) AND requester_id = auth.uid());

-- Staff view their own requests
CREATE POLICY "Staff view own permission requests"
ON public.permission_requests
FOR SELECT
TO authenticated
USING (requester_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Admins manage all
CREATE POLICY "Admins manage permission requests"
ON public.permission_requests
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update timestamp trigger
CREATE TRIGGER update_permission_requests_updated_at
BEFORE UPDATE ON public.permission_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Notify admins when a new permission request is created
CREATE OR REPLACE FUNCTION public.notify_admins_new_permission_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user RECORD;
BEGIN
  FOR admin_user IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      admin_user.user_id,
      '🔐 طلب صلاحية جديد',
      COALESCE(NEW.requester_name, 'موظف') || ' يطلب صلاحية: ' || NEW.action_description,
      'permission_request'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_permission_request
AFTER INSERT ON public.permission_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_permission_request();

-- Notify requester when reviewed
CREATE OR REPLACE FUNCTION public.notify_requester_permission_reviewed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.requester_id,
      CASE WHEN NEW.status = 'approved' THEN '✅ تمت الموافقة على طلبك' ELSE '❌ تم رفض طلبك' END,
      'طلب الصلاحية: ' || NEW.action_description || COALESCE(' — ' || NEW.admin_response, ''),
      CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'warning' END
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_requester_reviewed
AFTER UPDATE ON public.permission_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_requester_permission_reviewed();

CREATE INDEX idx_permission_requests_status ON public.permission_requests(status, created_at DESC);
CREATE INDEX idx_permission_requests_requester ON public.permission_requests(requester_id, created_at DESC);
