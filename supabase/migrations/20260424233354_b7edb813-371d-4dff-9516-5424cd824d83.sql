-- Clean up historical page_visits from staff users (admins + moderators)
DELETE FROM public.page_visits
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'moderator')
);

-- Also clean customer_sessions for staff (they shouldn't appear as customers)
DELETE FROM public.customer_sessions
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'moderator')
);