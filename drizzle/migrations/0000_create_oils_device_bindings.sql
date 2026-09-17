CREATE TABLE public.oils_device_bindings (
  user_id uuid PRIMARY KEY,
  device_id text NOT NULL,
  device_label text,
  bound_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.oils_device_bindings TO authenticated;
GRANT ALL ON public.oils_device_bindings TO service_role;

ALTER TABLE public.oils_device_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own oils device binding"
ON public.oils_device_bindings FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own oils device binding"
ON public.oils_device_bindings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can touch own oils device binding"
ON public.oils_device_bindings FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can manage oils device bindings"
ON public.oils_device_bindings FOR ALL TO authenticated
USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.protect_oils_device_binding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.device_id IS DISTINCT FROM OLD.device_id AND NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'device binding is locked';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_oils_device_binding_trg
BEFORE UPDATE ON public.oils_device_bindings
FOR EACH ROW EXECUTE FUNCTION public.protect_oils_device_binding();