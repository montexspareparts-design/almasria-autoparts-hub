
-- 1) Enable RLS on internal ERP staging table (admin-only)
ALTER TABLE public._erp_pn_stage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage erp pn stage" ON public._erp_pn_stage;
CREATE POLICY "Admins manage erp pn stage"
ON public._erp_pn_stage
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Remove anonymous Realtime subscription to public:* topics.
-- Sensitive tables (orders, profiles, customer_communications, whatsapp_*, support_requests)
-- broadcast via Realtime; anon should not receive any of these changes.
DROP POLICY IF EXISTS "Anon may subscribe to public topics" ON realtime.messages;
