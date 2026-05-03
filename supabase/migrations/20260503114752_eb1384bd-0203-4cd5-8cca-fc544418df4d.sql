ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_communications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_task_action_log;
ALTER TABLE public.customer_communications REPLICA IDENTITY FULL;
ALTER TABLE public.staff_task_action_log REPLICA IDENTITY FULL;