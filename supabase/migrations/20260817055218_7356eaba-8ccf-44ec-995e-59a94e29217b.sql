UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'play.review.dealer@almasriaautoparts.com';

INSERT INTO public.dealer_accounts (user_id, tier, is_active, business_type, min_order_amount, credit_limit, notes)
SELECT u.id, 'wholesale_tier1'::customer_tier, true, 'wholesale', 0, 0, 'Google Play review demo dealer account'
FROM auth.users u
WHERE u.email = 'play.review.dealer@almasriaautoparts.com'
ON CONFLICT DO NOTHING;