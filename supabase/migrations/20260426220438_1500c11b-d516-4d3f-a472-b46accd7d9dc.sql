-- Add reminder system to customer_communications
ALTER TABLE public.customer_communications
  ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_done BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS done_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visitor_session_key TEXT;

-- Allow customer_user_id to be nullable (for anonymous visitors)
ALTER TABLE public.customer_communications
  ALTER COLUMN customer_user_id DROP NOT NULL;

-- Constraint: must have either customer_user_id or visitor_session_key
ALTER TABLE public.customer_communications
  DROP CONSTRAINT IF EXISTS customer_communications_target_check;
ALTER TABLE public.customer_communications
  ADD CONSTRAINT customer_communications_target_check
  CHECK (customer_user_id IS NOT NULL OR visitor_session_key IS NOT NULL);

-- Index for reminder queries (open reminders sorted by due date)
CREATE INDEX IF NOT EXISTS idx_customer_communications_reminder_open
  ON public.customer_communications (reminder_at)
  WHERE reminder_at IS NOT NULL AND is_done = false;

-- Index by staff for "my reminders"
CREATE INDEX IF NOT EXISTS idx_customer_communications_staff_reminder
  ON public.customer_communications (staff_user_id, reminder_at)
  WHERE reminder_at IS NOT NULL AND is_done = false;