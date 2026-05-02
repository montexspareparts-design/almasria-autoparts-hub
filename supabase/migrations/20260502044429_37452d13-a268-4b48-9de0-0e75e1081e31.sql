
-- ============================================================
-- 1) reporter_daily_targets — الأهداف اليومية لكل موظف
-- ============================================================
CREATE TABLE public.reporter_daily_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- NULL = هدف افتراضي للجميع، non-NULL = هدف مخصّص لموظف
  calls_target INTEGER NOT NULL DEFAULT 30,
  quotations_target INTEGER NOT NULL DEFAULT 10,
  new_customers_target INTEGER NOT NULL DEFAULT 2,
  offers_converted_target INTEGER NOT NULL DEFAULT 5,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE, -- NULL = ساري حتى إشعار آخر
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_reporter_targets_user ON public.reporter_daily_targets(user_id, effective_from DESC);
-- لا يمكن وجود أكثر من هدف افتراضي واحد ساري في نفس اليوم
CREATE UNIQUE INDEX idx_reporter_targets_default_unique
  ON public.reporter_daily_targets(effective_from)
  WHERE user_id IS NULL AND effective_to IS NULL;

ALTER TABLE public.reporter_daily_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage targets"
  ON public.reporter_daily_targets FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff view targets (own or default)"
  ON public.reporter_daily_targets FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()) AND (user_id IS NULL OR user_id = auth.uid()));

CREATE TRIGGER trg_reporter_targets_updated_at
  BEFORE UPDATE ON public.reporter_daily_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- إدراج هدف افتراضي مبدئي للجميع
INSERT INTO public.reporter_daily_targets
  (user_id, calls_target, quotations_target, new_customers_target, offers_converted_target)
VALUES
  (NULL, 30, 10, 2, 5);

-- ============================================================
-- 2) reporter_badges — شارات تحفيزية
-- ============================================================
CREATE TABLE public.reporter_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_code TEXT NOT NULL, -- e.g. 'streak_7', 'streak_30', 'top_conversion', 'first_100_calls'
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, badge_code, awarded_at)
);

CREATE INDEX idx_reporter_badges_user ON public.reporter_badges(user_id, awarded_at DESC);

ALTER TABLE public.reporter_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage badges"
  ON public.reporter_badges FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff view own badges"
  ON public.reporter_badges FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_staff(auth.uid()));

-- ============================================================
-- 3) Helper RPC: جلب الهدف الفعلي لموظف اليوم (مخصّص أو افتراضي)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_effective_targets(_user_id UUID)
RETURNS TABLE (
  calls_target INTEGER,
  quotations_target INTEGER,
  new_customers_target INTEGER,
  offers_converted_target INTEGER,
  is_custom BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- أولوية للهدف المخصّص الساري، ثم الافتراضي الساري
  SELECT calls_target, quotations_target, new_customers_target, offers_converted_target,
         (user_id IS NOT NULL) AS is_custom
  FROM public.reporter_daily_targets
  WHERE (user_id = _user_id OR user_id IS NULL)
    AND effective_from <= CURRENT_DATE
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  ORDER BY (user_id IS NOT NULL) DESC, effective_from DESC
  LIMIT 1;
$$;

-- ============================================================
-- 4) Helper RPC: حساب سلسلة التسليم (streak) لموظف
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_submit_streak(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  found_today BOOLEAN;
BEGIN
  -- لو لم يسلّم اليوم، نبدأ العدّ من امبارح
  SELECT EXISTS (
    SELECT 1 FROM public.reporter_daily_reports
    WHERE user_id = _user_id AND report_date = CURRENT_DATE AND is_submitted = true
  ) INTO found_today;

  IF NOT found_today THEN
    check_date := CURRENT_DATE - 1;
  END IF;

  LOOP
    IF EXISTS (
      SELECT 1 FROM public.reporter_daily_reports
      WHERE user_id = _user_id AND report_date = check_date AND is_submitted = true
    ) THEN
      streak := streak + 1;
      check_date := check_date - 1;
    ELSE
      EXIT;
    END IF;
    -- حد أقصى 365 يوم منعاً للحلقات اللانهائية
    IF streak >= 365 THEN EXIT; END IF;
  END LOOP;

  RETURN streak;
END;
$$;

-- ============================================================
-- 5) Helper RPC: متوسط الفريق اليوم (anonymous aggregate)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_team_avg_today()
RETURNS TABLE (
  team_size INTEGER,
  avg_calls NUMERIC,
  avg_quotations NUMERIC,
  avg_new_customers NUMERIC,
  avg_offers_converted NUMERIC,
  avg_score NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::INTEGER AS team_size,
    ROUND(AVG(calls_count)::NUMERIC, 1) AS avg_calls,
    ROUND(AVG(quotations_count)::NUMERIC, 1) AS avg_quotations,
    ROUND(AVG(new_customers_count)::NUMERIC, 1) AS avg_new_customers,
    ROUND(AVG(offers_converted_count)::NUMERIC, 1) AS avg_offers_converted,
    ROUND(AVG(
      GREATEST(0,
        COALESCE(offers_converted_count,0) * 3 +
        COALESCE(new_customers_count,0) * 2 +
        COALESCE(calls_count,0) +
        COALESCE(followups_count,0) -
        COALESCE(incomplete_orders_count,0)
      )
    )::NUMERIC, 1) AS avg_score
  FROM public.reporter_daily_reports
  WHERE report_date = CURRENT_DATE AND is_submitted = true;
$$;
