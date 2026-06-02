-- Tighten Realtime topic authorization: regular authenticated users may only
-- subscribe to their own user-scoped topics ("user:<uid>" or "user:<uid>:*").
-- Staff retain ability to subscribe to any topic via the existing policy.
DROP POLICY IF EXISTS "Authenticated users subscribe to scoped topics" ON realtime.messages;

CREATE POLICY "Authenticated users subscribe to own user topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('user:' || auth.uid()::text)
  OR realtime.topic() LIKE ('user:' || auth.uid()::text || ':%')
);