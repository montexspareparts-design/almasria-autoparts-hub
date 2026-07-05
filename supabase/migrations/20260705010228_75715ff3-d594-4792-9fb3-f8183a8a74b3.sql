
-- 1) Extra audit columns for password vaults
ALTER TABLE public.dealer_passwords
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purged_at timestamptz;

ALTER TABLE public.staff_passwords
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purged_at timestamptz;

-- 2) Reveal-and-purge RPC for dealer initial password (admin-only)
CREATE OR REPLACE FUNCTION public.reveal_dealer_initial_password(p_dealer_account_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pw text;
  v_row_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT id, initial_password INTO v_row_id, v_pw
  FROM public.dealer_passwords
  WHERE dealer_account_id = p_dealer_account_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_row_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Purge the plaintext value after returning it once; keep audit trail
  UPDATE public.dealer_passwords
  SET initial_password = NULL,
      viewed_by = v_uid,
      viewed_at = COALESCE(viewed_at, now()),
      view_count = view_count + 1,
      purged_at = CASE WHEN initial_password IS NOT NULL THEN now() ELSE purged_at END
  WHERE id = v_row_id;

  INSERT INTO public.audit_logs (performed_by, action, table_name, record_id, old_data)
  VALUES (v_uid, 'reveal_dealer_password', 'dealer_passwords', v_row_id,
          jsonb_build_object('dealer_account_id', p_dealer_account_id));

  RETURN v_pw;
END
$$;

REVOKE ALL ON FUNCTION public.reveal_dealer_initial_password(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reveal_dealer_initial_password(uuid) TO authenticated;

-- 3) Reveal-and-purge RPC for staff initial password (admin-only)
CREATE OR REPLACE FUNCTION public.reveal_staff_initial_password(p_staff_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pw text;
  v_row_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT id, initial_password INTO v_row_id, v_pw
  FROM public.staff_passwords
  WHERE staff_user_id = p_staff_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_row_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.staff_passwords
  SET initial_password = NULL,
      viewed_by = v_uid,
      viewed_at = COALESCE(viewed_at, now()),
      view_count = view_count + 1,
      purged_at = CASE WHEN initial_password IS NOT NULL THEN now() ELSE purged_at END
  WHERE id = v_row_id;

  INSERT INTO public.audit_logs (performed_by, action, table_name, record_id, old_data)
  VALUES (v_uid, 'reveal_staff_password', 'staff_passwords', v_row_id,
          jsonb_build_object('staff_user_id', p_staff_user_id));

  RETURN v_pw;
END
$$;

REVOKE ALL ON FUNCTION public.reveal_staff_initial_password(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reveal_staff_initial_password(uuid) TO authenticated;

-- 4) Boolean helper: does a dealer have stored credentials? (admin-only; no plaintext exposure)
CREATE OR REPLACE FUNCTION public.dealer_has_credentials(p_dealer_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dealer_passwords
    WHERE dealer_account_id = p_dealer_account_id
      AND initial_password IS NOT NULL
      AND public.has_role(auth.uid(), 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.dealer_has_credentials(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dealer_has_credentials(uuid) TO authenticated;

-- 5) Narrow staff_task_action_log SELECT — admins/moderators only (drop reporters)
DROP POLICY IF EXISTS "Staff can view all task action log" ON public.staff_task_action_log;

CREATE POLICY "Admins and moderators can view task action log"
ON public.staff_task_action_log
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
  OR staff_user_id = auth.uid()
);
