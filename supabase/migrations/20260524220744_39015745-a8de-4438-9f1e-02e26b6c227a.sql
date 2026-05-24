DROP TRIGGER IF EXISTS trg_notify_on_reporter_submit ON public.reporter_daily_reports;
CREATE TRIGGER trg_notify_on_reporter_submit
  AFTER UPDATE ON public.reporter_daily_reports
  FOR EACH ROW
  WHEN (NEW.is_submitted = true AND COALESCE(OLD.is_submitted, false) = false)
  EXECUTE FUNCTION public.notify_on_reporter_submit();

DROP TRIGGER IF EXISTS trg_notify_on_reporter_submit_ins ON public.reporter_daily_reports;
CREATE TRIGGER trg_notify_on_reporter_submit_ins
  AFTER INSERT ON public.reporter_daily_reports
  FOR EACH ROW
  WHEN (NEW.is_submitted = true)
  EXECUTE FUNCTION public.notify_on_reporter_submit();