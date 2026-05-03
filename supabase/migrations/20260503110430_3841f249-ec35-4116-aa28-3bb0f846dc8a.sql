-- Append-only audit log for every action taken on a task
CREATE TABLE IF NOT EXISTS public.staff_task_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id text NOT NULL,
  staff_user_id uuid NOT NULL,
  staff_name text,
  action text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_action_log_task ON public.staff_task_action_log (task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_action_log_staff ON public.staff_task_action_log (staff_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_action_log_created ON public.staff_task_action_log (created_at DESC);

ALTER TABLE public.staff_task_action_log ENABLE ROW LEVEL SECURITY;

-- All staff (including moderators) can view the full action log → transparency
CREATE POLICY "Staff can view all task action log"
ON public.staff_task_action_log FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Each staff member can only insert their own actions
CREATE POLICY "Staff can insert their own task actions"
ON public.staff_task_action_log FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = staff_user_id AND public.is_staff(auth.uid()));

-- Trigger: every INSERT/UPDATE on staff_task_handling appends a row to the log
CREATE OR REPLACE FUNCTION public.log_staff_task_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff_task_action_log (task_id, staff_user_id, staff_name, action, note, created_at)
  VALUES (NEW.task_id, NEW.staff_user_id, NEW.staff_name, NEW.action, NEW.note, COALESCE(NEW.created_at, now()));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_staff_task_action ON public.staff_task_handling;
CREATE TRIGGER trg_log_staff_task_action
AFTER INSERT OR UPDATE ON public.staff_task_handling
FOR EACH ROW EXECUTE FUNCTION public.log_staff_task_action();

-- Backfill from current handling table
INSERT INTO public.staff_task_action_log (task_id, staff_user_id, staff_name, action, note, created_at)
SELECT task_id, staff_user_id, staff_name, action, note, created_at
FROM public.staff_task_handling
ON CONFLICT DO NOTHING;