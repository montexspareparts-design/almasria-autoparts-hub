CREATE TABLE IF NOT EXISTS public.staff_ui_dismissals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  dismissal_key text NOT NULL,
  seen_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dismissal_key)
);

CREATE INDEX IF NOT EXISTS idx_staff_ui_dismissals_user_key
  ON public.staff_ui_dismissals (user_id, dismissal_key);

ALTER TABLE public.staff_ui_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dismissals"
  ON public.staff_ui_dismissals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dismissals"
  ON public.staff_ui_dismissals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dismissals"
  ON public.staff_ui_dismissals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dismissals"
  ON public.staff_ui_dismissals FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_staff_ui_dismissals_updated_at
  BEFORE UPDATE ON public.staff_ui_dismissals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_ui_dismissals;