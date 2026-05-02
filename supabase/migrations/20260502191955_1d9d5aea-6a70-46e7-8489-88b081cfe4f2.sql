CREATE OR REPLACE FUNCTION public.get_staff_activity_enhanced(_target_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(user_id uuid, full_name text, email text, role app_role, first_seen_at timestamp with time zone, last_seen_at timestamp with time zone, page_views integer, session_minutes numeric, paths_count integer, top_paths text[], last_path text, status text, seconds_since_last bigint, daily_report_submitted boolean, shortage_reports_today integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    a.paths[1:5] AS top_paths,
    a.paths[1] AS last_path,
    CASE
      WHEN a.last_seen_at >= now() - interval '2 minutes' THEN 'online'
      WHEN a.last_seen_at >= now() - interval '15 minutes' THEN 'idle'
      ELSE 'offline'
    END AS status,
    EXTRACT(EPOCH FROM (now() - a.last_seen_at))::bigint AS seconds_since_last,
    EXISTS (
      SELECT 1 FROM public.reporter_daily_reports rd
      WHERE rd.user_id = a.user_id
        AND rd.report_date = _target_date
        AND COALESCE(rd.is_submitted, false) = true
    ) AS daily_report_submitted,
    (SELECT COUNT(*)::int FROM public.stock_shortage_requests sr
      WHERE sr.requested_by = a.user_id
        AND sr.created_at::date = _target_date) AS shortage_reports_today
  FROM public.staff_session_activity a
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  LEFT JOIN auth.users au ON au.id = a.user_id
  WHERE a.session_date = _target_date
  ORDER BY a.last_seen_at DESC;
END;
$function$;