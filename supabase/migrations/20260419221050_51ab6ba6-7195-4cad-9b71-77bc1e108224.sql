-- WhatsApp Inbox System

-- 1) Conversations table — one row per phone number
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  contact_name text,
  customer_user_id uuid,
  assigned_to uuid,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  unread_count integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_phone ON public.whatsapp_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_wa_conv_assigned ON public.whatsapp_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_wa_conv_last_msg ON public.whatsapp_conversations(last_message_at DESC);

-- 2) Messages table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  phone text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','system','customer')),
  message_type text NOT NULL DEFAULT 'text',
  body text,
  media_url text,
  media_mime text,
  media_caption text,
  meta_message_id text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('queued','sent','delivered','read','failed','received')),
  error_message text,
  sent_by uuid,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_msg_conv ON public.whatsapp_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_msg_meta ON public.whatsapp_messages(meta_message_id);

-- 3) Trigger: update conversation aggregates when a new message arrives
CREATE OR REPLACE FUNCTION public.update_whatsapp_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.whatsapp_conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(COALESCE(NEW.body, NEW.media_caption, '[' || NEW.message_type || ']'), 200),
    unread_count = CASE 
      WHEN NEW.direction = 'inbound' THEN unread_count + 1 
      ELSE unread_count 
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_wa_conv_on_msg ON public.whatsapp_messages;
CREATE TRIGGER trg_update_wa_conv_on_msg
AFTER INSERT ON public.whatsapp_messages
FOR EACH ROW EXECUTE FUNCTION public.update_whatsapp_conversation_on_message();

-- 4) RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Admins manage everything
CREATE POLICY "Admins manage all conversations" ON public.whatsapp_conversations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage all messages" ON public.whatsapp_messages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Moderators see only conversations assigned to them (or unassigned)
CREATE POLICY "Moderators view assigned conversations" ON public.whatsapp_conversations
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'moderator') 
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  );

CREATE POLICY "Moderators update assigned conversations" ON public.whatsapp_conversations
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'moderator') 
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  );

CREATE POLICY "Moderators view assigned messages" ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'moderator')
    AND EXISTS (
      SELECT 1 FROM public.whatsapp_conversations c
      WHERE c.id = whatsapp_messages.conversation_id
        AND (c.assigned_to = auth.uid() OR c.assigned_to IS NULL)
    )
  );

CREATE POLICY "Moderators send messages on assigned conversations" ON public.whatsapp_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'moderator')
    AND sent_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.whatsapp_conversations c
      WHERE c.id = conversation_id
        AND (c.assigned_to = auth.uid() OR c.assigned_to IS NULL)
    )
  );

-- 5) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER TABLE public.whatsapp_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;

-- 6) Storage bucket for inbound/outbound media
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Staff read whatsapp media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'whatsapp-media' AND is_staff(auth.uid()));

CREATE POLICY "Staff upload whatsapp media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'whatsapp-media' AND is_staff(auth.uid()));

-- 7) updated_at trigger
DROP TRIGGER IF EXISTS trg_wa_conv_updated_at ON public.whatsapp_conversations;
CREATE TRIGGER trg_wa_conv_updated_at
BEFORE UPDATE ON public.whatsapp_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();