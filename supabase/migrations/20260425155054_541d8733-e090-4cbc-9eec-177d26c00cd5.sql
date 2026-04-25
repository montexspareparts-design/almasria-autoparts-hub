-- 1) Teams
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text DEFAULT '#3B82F6',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage teams" ON public.teams
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff view teams" ON public.teams
  FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));

-- 2) Team Members
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  added_by uuid,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_members_team ON public.team_members(team_id);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage team members" ON public.team_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff view own memberships" ON public.team_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_staff(auth.uid()));

-- Helper: get user's teams
CREATE OR REPLACE FUNCTION public.user_team_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = _user_id
$$;

-- 3) Daily Report Questions
CREATE TABLE public.daily_report_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'text', -- text, number, textarea, choice, boolean
  options jsonb DEFAULT '[]'::jsonb,           -- for choice type
  placeholder text,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  -- targeting
  target_scope text NOT NULL DEFAULT 'all',    -- all, role, team, users
  target_role app_role,                         -- when scope = 'role'
  target_team_ids uuid[] DEFAULT '{}',          -- when scope = 'team'
  target_user_ids uuid[] DEFAULT '{}',          -- when scope = 'users'
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_drq_active ON public.daily_report_questions(is_active, sort_order);

ALTER TABLE public.daily_report_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage questions" ON public.daily_report_questions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Staff see only questions targeted at them
CREATE POLICY "Staff view their questions" ON public.daily_report_questions
  FOR SELECT TO authenticated
  USING (
    is_active = true AND is_staff(auth.uid()) AND (
      target_scope = 'all'
      OR (target_scope = 'role' AND has_role(auth.uid(), target_role))
      OR (target_scope = 'team' AND EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.user_id = auth.uid() AND tm.team_id = ANY(target_team_ids)
         ))
      OR (target_scope = 'users' AND auth.uid() = ANY(target_user_ids))
    )
  );

-- 4) Daily Report Answers
CREATE TABLE public.daily_report_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.daily_report_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  answer_text text,
  answer_number numeric,
  answer_boolean boolean,
  answer_choice text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id, report_date)
);

CREATE INDEX idx_dra_user_date ON public.daily_report_answers(user_id, report_date);

ALTER TABLE public.daily_report_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all answers" ON public.daily_report_answers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff manage own answers" ON public.daily_report_answers
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND is_staff(auth.uid()));

-- 5) updated_at triggers
CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_drq_updated BEFORE UPDATE ON public.daily_report_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_dra_updated BEFORE UPDATE ON public.daily_report_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();