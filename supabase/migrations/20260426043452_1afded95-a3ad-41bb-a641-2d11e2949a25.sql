-- Enable RLS (if not already) and add restrictive policies on realtime.messages
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to allow re-running
DROP POLICY IF EXISTS "Authenticated users subscribe to scoped topics" ON realtime.messages;
DROP POLICY IF EXISTS "Staff subscribe to any topic" ON realtime.messages;
DROP POLICY IF EXISTS "Anon may subscribe to public topics" ON realtime.messages;

-- Staff (admin / moderator) can use any realtime channel
CREATE POLICY "Staff subscribe to any topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.is_staff(auth.uid())
);

-- Authenticated end-users can only subscribe to:
--  - public:* channels
--  - user:{their-own-uid} channels
CREATE POLICY "Authenticated users subscribe to scoped topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() LIKE 'public:%')
  OR (realtime.topic() = 'user:' || auth.uid()::text)
  OR (realtime.topic() LIKE 'user:' || auth.uid()::text || ':%')
);

-- Anonymous visitors can only subscribe to public:* channels
CREATE POLICY "Anon may subscribe to public topics"
ON realtime.messages
FOR SELECT
TO anon
USING (
  realtime.topic() LIKE 'public:%'
);