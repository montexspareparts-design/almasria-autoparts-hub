-- Create a helper function to check if user is admin or moderator (staff)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'moderator')
  )
$$;

-- Update RLS policies to allow moderators access to key tables

-- Orders: moderators can view and manage
DROP POLICY IF EXISTS "Moderators can manage orders" ON public.orders;
CREATE POLICY "Moderators can manage orders"
ON public.orders FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- Order items: moderators can view and manage
DROP POLICY IF EXISTS "Moderators can manage order items" ON public.order_items;
CREATE POLICY "Moderators can manage order items"
ON public.order_items FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- Dealer applications: moderators can view and manage
DROP POLICY IF EXISTS "Moderators can manage applications" ON public.dealer_applications;
CREATE POLICY "Moderators can manage applications"
ON public.dealer_applications FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- Dealer accounts: moderators can view and manage
DROP POLICY IF EXISTS "Moderators can manage dealer accounts" ON public.dealer_accounts;
CREATE POLICY "Moderators can manage dealer accounts"
ON public.dealer_accounts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- Profiles: moderators can view all
DROP POLICY IF EXISTS "Moderators can view all profiles" ON public.profiles;
CREATE POLICY "Moderators can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'));

-- Products: moderators can manage
DROP POLICY IF EXISTS "Moderators can manage products" ON public.products;
CREATE POLICY "Moderators can manage products"
ON public.products FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- Price lists: moderators can view and manage
DROP POLICY IF EXISTS "Moderators can manage price lists" ON public.price_lists;
CREATE POLICY "Moderators can manage price lists"
ON public.price_lists FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- Price list products: moderators can manage
DROP POLICY IF EXISTS "Moderators can manage price list products" ON public.price_list_products;
CREATE POLICY "Moderators can manage price list products"
ON public.price_list_products FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- Customer search logs: moderators can view
DROP POLICY IF EXISTS "Moderators can view search logs" ON public.customer_search_logs;
CREATE POLICY "Moderators can view search logs"
ON public.customer_search_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'));

-- Dealer price views: moderators can view all
DROP POLICY IF EXISTS "Moderators can view all price views" ON public.dealer_price_views;
CREATE POLICY "Moderators can view all price views"
ON public.dealer_price_views FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'));

-- Leads: moderators can manage
DROP POLICY IF EXISTS "Moderators can manage leads" ON public.leads;
CREATE POLICY "Moderators can manage leads"
ON public.leads FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- Notifications: moderators can manage (for sending notifications)
DROP POLICY IF EXISTS "Moderators can manage notifications" ON public.notifications;
CREATE POLICY "Moderators can manage notifications"
ON public.notifications FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- ERP sync logs: moderators can view
DROP POLICY IF EXISTS "Moderators can view sync logs" ON public.erp_sync_logs;
CREATE POLICY "Moderators can view sync logs"
ON public.erp_sync_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'));

-- Site settings: moderators can view
DROP POLICY IF EXISTS "Moderators can view site settings" ON public.site_settings;
CREATE POLICY "Moderators can view site settings"
ON public.site_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'));