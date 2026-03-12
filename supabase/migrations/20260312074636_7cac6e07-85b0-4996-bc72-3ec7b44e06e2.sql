
-- 1. Trigger: notify all dealers when a product goes on sale
CREATE OR REPLACE FUNCTION public.notify_dealers_new_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when is_on_sale changes from false to true
  IF NEW.is_on_sale = true AND (OLD.is_on_sale = false OR OLD.is_on_sale IS NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT 
      da.user_id,
      '🏷️ عرض جديد!',
      'عرض خاص على "' || NEW.name_ar || '" (رقم القطعة: ' || NEW.sku || '). اطلبه الآن قبل انتهاء العرض!',
      'offer'
    FROM public.dealer_accounts da
    WHERE da.is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_sale_notify_dealers
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dealers_new_offer();

-- 2. Trigger: notify all dealers when a new price list is added
CREATE OR REPLACE FUNCTION public.notify_dealers_new_price_list()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_active = true THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT 
      da.user_id,
      '📋 كشف أسعار جديد',
      'تم إضافة كشف أسعار جديد: "' || NEW.title || '". يمكنك الاطلاع عليه من حسابك الآن.',
      'price_list'
    FROM public.dealer_accounts da
    WHERE da.is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_price_list_added_notify_dealers
  AFTER INSERT ON public.price_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dealers_new_price_list();

-- 3. Reviews table for product page
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  comment text,
  reviewer_name text,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON public.product_reviews
  FOR SELECT
  TO public
  USING (is_approved = true);

-- Authenticated users can insert their own reviews
CREATE POLICY "Users can insert own reviews"
  ON public.product_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can view own reviews
CREATE POLICY "Users can view own reviews"
  ON public.product_reviews
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can manage all reviews
CREATE POLICY "Admins can manage reviews"
  ON public.product_reviews
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
