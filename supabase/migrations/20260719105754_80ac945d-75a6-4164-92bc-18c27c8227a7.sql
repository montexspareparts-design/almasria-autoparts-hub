
-- 1) Promote Karam to moderator
INSERT INTO public.user_roles (user_id, role)
VALUES ('e16c7ad9-c78b-4f65-a951-813d7ddd177b', 'moderator')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Whitelist of assignable WhatsApp staff (Heba, Asmaa, Sarah)
CREATE TABLE IF NOT EXISTS public.whatsapp_assignable_staff (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_order int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whatsapp_assignable_staff TO authenticated;
GRANT ALL ON public.whatsapp_assignable_staff TO service_role;
ALTER TABLE public.whatsapp_assignable_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view assignable list" ON public.whatsapp_assignable_staff;
CREATE POLICY "Staff can view assignable list"
ON public.whatsapp_assignable_staff FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

INSERT INTO public.whatsapp_assignable_staff (user_id, sort_order) VALUES
  ('e18a9c48-a9ce-4f23-b7e0-d9be74dcc814', 1),  -- هبة فؤاد
  ('486f6a0b-8966-4ceb-b44a-9d529a113853', 2),  -- اسماء
  ('2fd8bb87-cddd-4993-b87d-ccbc70ad79c6', 3)   -- سارة
ON CONFLICT (user_id) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- 3) Round-robin re-assignment of ALL existing conversations across these 3
WITH staff AS (
  SELECT user_id, sort_order,
         ROW_NUMBER() OVER (ORDER BY sort_order) - 1 AS idx,
         COUNT(*) OVER () AS n
  FROM public.whatsapp_assignable_staff
),
convs AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) - 1 AS rn
  FROM public.whatsapp_conversations
),
mapped AS (
  SELECT c.id AS conv_id, s.user_id
  FROM convs c
  JOIN staff s ON s.idx = c.rn % (SELECT n FROM staff LIMIT 1)
)
UPDATE public.whatsapp_conversations w
SET assigned_to = m.user_id, updated_at = now()
FROM mapped m
WHERE w.id = m.conv_id;

-- 4) Auto-assign trigger for new conversations (round-robin by count)
CREATE OR REPLACE FUNCTION public.autoassign_whatsapp_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  picked uuid;
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Pick the assignable staff with the fewest current conversations
  SELECT s.user_id INTO picked
  FROM public.whatsapp_assignable_staff s
  LEFT JOIN public.whatsapp_conversations c
    ON c.assigned_to = s.user_id AND c.is_archived = false
  GROUP BY s.user_id, s.sort_order
  ORDER BY COUNT(c.id) ASC, s.sort_order ASC
  LIMIT 1;

  IF picked IS NOT NULL THEN
    NEW.assigned_to := picked;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autoassign_whatsapp_conversation ON public.whatsapp_conversations;
CREATE TRIGGER trg_autoassign_whatsapp_conversation
BEFORE INSERT ON public.whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION public.autoassign_whatsapp_conversation();

-- 5) Permission check used by the send-message edge function
CREATE OR REPLACE FUNCTION public.can_reply_whatsapp_conversation(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'moderator'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_conversations c
      WHERE c.id = _conversation_id
        AND c.assigned_to = _user_id
    );
$$;
GRANT EXECUTE ON FUNCTION public.can_reply_whatsapp_conversation(uuid, uuid) TO authenticated, service_role;
