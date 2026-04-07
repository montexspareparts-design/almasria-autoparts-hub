
CREATE OR REPLACE FUNCTION public.log_admin_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _action text;
  _user_id uuid;
  _old jsonb := NULL;
  _new jsonb := NULL;
  _record_id text;
BEGIN
  _user_id := auth.uid();
  
  -- Only log actions by staff (admins + moderators)
  IF _user_id IS NULL OR NOT public.is_staff(_user_id) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    _action := 'create';
    _new := to_jsonb(NEW);
    _record_id := NEW.id::text;
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update';
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
    _record_id := NEW.id::text;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'delete';
    _old := to_jsonb(OLD);
    _record_id := OLD.id::text;
  END IF;

  INSERT INTO public.audit_logs (performed_by, action, table_name, record_id, old_data, new_data)
  VALUES (_user_id, _action, TG_TABLE_NAME, _record_id, _old, _new);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

-- Allow moderators to view audit logs (for staff activity)
CREATE POLICY "Moderators can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'));
