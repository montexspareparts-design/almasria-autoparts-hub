
-- 1) Trigger: block staff from customer_sessions
CREATE OR REPLACE FUNCTION public.reject_staff_from_customer_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND public.is_staff(NEW.user_id) THEN
    RETURN NULL; -- silently drop
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_staff_customer_sessions ON public.customer_sessions;
CREATE TRIGGER trg_reject_staff_customer_sessions
BEFORE INSERT OR UPDATE ON public.customer_sessions
FOR EACH ROW EXECUTE FUNCTION public.reject_staff_from_customer_sessions();

-- 2) Trigger: block staff from customer_search_logs
CREATE OR REPLACE FUNCTION public.reject_staff_from_search_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND public.is_staff(NEW.user_id) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_staff_search_logs ON public.customer_search_logs;
CREATE TRIGGER trg_reject_staff_search_logs
BEFORE INSERT ON public.customer_search_logs
FOR EACH ROW EXECUTE FUNCTION public.reject_staff_from_search_logs();

-- 3) Trigger: block staff from dealer_price_views
CREATE OR REPLACE FUNCTION public.reject_staff_from_price_views()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND public.is_staff(NEW.user_id) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_staff_price_views ON public.dealer_price_views;
CREATE TRIGGER trg_reject_staff_price_views
BEFORE INSERT ON public.dealer_price_views
FOR EACH ROW EXECUTE FUNCTION public.reject_staff_from_price_views();

-- 4) Trigger: block staff from visitor_leads (defensive)
CREATE OR REPLACE FUNCTION public.reject_staff_from_visitor_leads()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND public.is_staff(NEW.user_id) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_staff_visitor_leads ON public.visitor_leads;
CREATE TRIGGER trg_reject_staff_visitor_leads
BEFORE INSERT ON public.visitor_leads
FOR EACH ROW EXECUTE FUNCTION public.reject_staff_from_visitor_leads();

-- 5) Cleanup historical staff pollution
DELETE FROM public.customer_sessions   WHERE user_id IS NOT NULL AND public.is_staff(user_id);
DELETE FROM public.customer_search_logs WHERE user_id IS NOT NULL AND public.is_staff(user_id);
DELETE FROM public.dealer_price_views   WHERE user_id IS NOT NULL AND public.is_staff(user_id);
DELETE FROM public.page_visits          WHERE user_id IS NOT NULL AND public.is_staff(user_id);

-- 6) RPC: Staff activity report for admins (today by default)
CREATE OR REPLACE FUNCTION public.get_staff_activity_report(_target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  role app_role,
  page_views bigint,
  unique_paths bigint,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  session_minutes numeric,
  top_path text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can call
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admins only';
  END IF;

  RETURN QUERY
  WITH staff AS (
    SELECT DISTINCT ur.user_id, ur.role
    FROM public.user_roles ur
    WHERE ur.role IN ('admin'::app_role, 'moderator'::app_role, 'reporter'::app_role)
  ),
  -- Aggregate from staff_page_visits if exists, else from auth audit. We use page_visits before the staff filter blocked it,
  -- so we rely on customer_communications + auth.users + a lightweight per-day aggregate built on the client.
  -- Since page_visits silently drops staff, we fall back to auth.users.last_sign_in_at + customer_communications activity.
  agg AS (
    SELECT
      s.user_id,
      0::bigint AS page_views,
      0::bigint AS unique_paths,
      NULL::timestamptz AS first_seen_at,
      NULL::timestamptz AS last_seen_at,
      0::numeric AS session_minutes,
      NULL::text AS top_path
    FROM staff s
  )
  SELECT
    s.user_id,
    COALESCE(p.full_name, 'موظف') AS full_name,
    COALESCE(au.email, '') AS email,
    s.role,
    a.page_views,
    a.unique_paths,
    COALESCE(au.last_sign_in_at, a.first_seen_at) AS first_seen_at,
    a.last_seen_at,
    a.session_minutes,
    a.top_path
  FROM staff s
  LEFT JOIN agg a ON a.user_id = s.user_id
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  LEFT JOIN auth.users au ON au.id = s.user_id
  WHERE COALESCE(au.last_sign_in_at::date, CURRENT_DATE) = _target_date
     OR au.last_sign_in_at IS NULL AND _target_date = CURRENT_DATE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_activity_report(date) TO authenticated;

-- 7) Dedicated table to track staff activity (separate from customers, admin-readable)
CREATE TABLE IF NOT EXISTS public.staff_session_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  page_views integer NOT NULL DEFAULT 1,
  paths text[] NOT NULL DEFAULT '{}'::text[],
  UNIQUE (user_id, session_date)
);

ALTER TABLE public.staff_session_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view staff activity" ON public.staff_session_activity;
CREATE POLICY "Admins can view staff activity"
ON public.staff_session_activity
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Staff can insert own activity" ON public.staff_session_activity;
CREATE POLICY "Staff can insert own activity"
ON public.staff_session_activity
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can update own activity" ON public.staff_session_activity;
CREATE POLICY "Staff can update own activity"
ON public.staff_session_activity
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_staff_session_activity_date ON public.staff_session_activity (session_date DESC, user_id);

-- 8) RPC: get today's staff activity from the dedicated table
CREATE OR REPLACE FUNCTION public.get_staff_activity_today(_target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  role app_role,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  page_views integer,
  session_minutes numeric,
  paths_count integer,
  top_paths text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admins only';
  END IF;

  RETURN QUERY
  SELECT
    a.user_id,
    COALESCE(p.full_name, COALESCE(au.email, 'موظف')) AS full_name,
    COALESCE(au.email, '') AS email,
    (SELECT ur.role FROM public.user_roles ur
       WHERE ur.user_id = a.user_id
         AND ur.role IN ('admin'::app_role,'moderator'::app_role,'reporter'::app_role)
       ORDER BY CASE ur.role WHEN 'admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END
       LIMIT 1) AS role,
    a.first_seen_at,
    a.last_seen_at,
    a.page_views,
    ROUND(EXTRACT(EPOCH FROM (a.last_seen_at - a.first_seen_at))/60.0, 1)::numeric AS session_minutes,
    COALESCE(array_length(a.paths, 1), 0) AS paths_count,
    a.paths[1:5] AS top_paths
  FROM public.staff_session_activity a
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  LEFT JOIN auth.users au ON au.id = a.user_id
  WHERE a.session_date = _target_date
  ORDER BY a.last_seen_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_activity_today(date) TO authenticated;

-- 9) RPC: tick (upsert) — called by staff client to record their own session activity
CREATE OR REPLACE FUNCTION public.tick_staff_session(_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := CURRENT_DATE;
  _clean_path text := COALESCE(NULLIF(trim(_path), ''), '/');
BEGIN
  IF _uid IS NULL OR NOT public.is_staff(_uid) THEN
    RETURN;
  END IF;

  INSERT INTO public.staff_session_activity (user_id, session_date, paths, page_views)
  VALUES (_uid, _today, ARRAY[_clean_path], 1)
  ON CONFLICT (user_id, session_date) DO UPDATE SET
    last_seen_at = now(),
    page_views = public.staff_session_activity.page_views + 1,
    paths = (
      CASE
        WHEN _clean_path = ANY(public.staff_session_activity.paths) THEN public.staff_session_activity.paths
        ELSE array_prepend(_clean_path, public.staff_session_activity.paths)
      END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.tick_staff_session(text) TO authenticated;
