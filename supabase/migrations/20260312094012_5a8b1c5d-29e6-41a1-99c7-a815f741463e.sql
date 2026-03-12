
-- Drop the trigger that won't work without proper pg_net setup
DROP TRIGGER IF EXISTS on_notification_insert_push ON public.notifications;
DROP FUNCTION IF EXISTS public.trigger_push_on_notification();
