
-- Add new columns for enhanced reporter daily reports
ALTER TABLE public.reporter_daily_reports
  ADD COLUMN IF NOT EXISTS mood TEXT CHECK (mood IN ('happy','neutral','sad')),
  ADD COLUMN IF NOT EXISTS shoutout_user_id UUID,
  ADD COLUMN IF NOT EXISTS shoutout_reason TEXT,
  ADD COLUMN IF NOT EXISTS why_good_day TEXT;

-- Trigger: when a report is submitted with a shoutout, send a thank-you notification to the colleague
CREATE OR REPLACE FUNCTION public.notify_shoutout_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
BEGIN
  IF NEW.is_submitted = true 
     AND NEW.shoutout_user_id IS NOT NULL 
     AND (OLD IS NULL OR OLD.is_submitted = false OR OLD.shoutout_user_id IS DISTINCT FROM NEW.shoutout_user_id)
  THEN
    SELECT COALESCE(full_name, email, 'زميلك') INTO sender_name
    FROM public.profiles WHERE user_id = NEW.user_id;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.shoutout_user_id,
      '👏 شكر من زميل',
      sender_name || ' وجّه ليك شكر في تقرير اليوم: ' || COALESCE(NEW.shoutout_reason, 'ساعدتني النهاردة، تسلم!'),
      'shoutout'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_shoutout_recipient ON public.reporter_daily_reports;
CREATE TRIGGER trg_notify_shoutout_recipient
AFTER INSERT OR UPDATE ON public.reporter_daily_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_shoutout_recipient();
