CREATE OR REPLACE FUNCTION public.log_customer_communication_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_staff_name text;
  audit_action text;
BEGIN
  SELECT p.full_name
    INTO resolved_staff_name
  FROM public.profiles p
  WHERE p.user_id = NEW.staff_user_id
  LIMIT 1;

  audit_action := CASE NEW.comm_type
    WHEN 'phone' THEN 'call'
    WHEN 'whatsapp' THEN 'whatsapp'
    WHEN 'no_answer' THEN 'no_answer'
    WHEN 'visit' THEN 'visit'
    WHEN 'note' THEN 'note'
    ELSE COALESCE(NEW.comm_type, 'note')
  END;

  INSERT INTO public.staff_task_action_log (
    task_id,
    staff_user_id,
    staff_name,
    action,
    note,
    created_at
  )
  VALUES (
    NEW.customer_user_id::text || ':active_visitor',
    NEW.staff_user_id,
    COALESCE(resolved_staff_name, 'موظف'),
    audit_action,
    CASE
      WHEN NEW.note IS NULL OR btrim(NEW.note) = '' THEN '[الزوار النشطون] إجراء سريع'
      ELSE '[الزوار النشطون] ' || btrim(NEW.note)
    END,
    NEW.created_at
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_customer_communication_action ON public.customer_communications;
CREATE TRIGGER trg_log_customer_communication_action
AFTER INSERT ON public.customer_communications
FOR EACH ROW
EXECUTE FUNCTION public.log_customer_communication_action();