
-- Customer rating table for support requests
CREATE TABLE public.support_request_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  support_request_id uuid NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL,
  customer_user_id uuid,
  customer_phone text,
  rating smallint NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_request_ratings_unique UNIQUE (support_request_id),
  CONSTRAINT support_request_ratings_range CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_support_ratings_staff ON public.support_request_ratings(staff_user_id);
CREATE INDEX idx_support_ratings_customer ON public.support_request_ratings(customer_user_id);

ALTER TABLE public.support_request_ratings ENABLE ROW LEVEL SECURITY;

-- Customer can insert rating for their own resolved request
CREATE POLICY "Customers can rate own resolved requests"
ON public.support_request_ratings
FOR INSERT
TO authenticated
WITH CHECK (
  customer_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.support_requests sr
    WHERE sr.id = support_request_id
      AND sr.user_id = auth.uid()
      AND sr.status IN ('resolved', 'closed')
  )
);

-- Customers can view own ratings
CREATE POLICY "Customers view own ratings"
ON public.support_request_ratings
FOR SELECT
TO authenticated
USING (customer_user_id = auth.uid());

-- Staff can view all ratings (for performance dashboard)
CREATE POLICY "Staff view all ratings"
ON public.support_request_ratings
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Admins can manage all
CREATE POLICY "Admins manage all ratings"
ON public.support_request_ratings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Notification trigger: notify staff when they get a new rating
CREATE OR REPLACE FUNCTION public.notify_staff_on_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stars text := repeat('⭐', NEW.rating);
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.staff_user_id,
    _stars || ' تقييم جديد من عميل',
    'تم تقييم خدمتك بـ ' || NEW.rating || '/5' ||
    CASE WHEN NEW.comment IS NOT NULL AND NEW.comment != '' 
         THEN ' — تعليق: ' || LEFT(NEW.comment, 150) 
         ELSE '' END,
    'rating'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_staff_on_rating
AFTER INSERT ON public.support_request_ratings
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_on_rating();
