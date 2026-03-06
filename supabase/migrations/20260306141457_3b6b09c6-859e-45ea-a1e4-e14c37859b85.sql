
-- ==========================================
-- Al Masria Group - Dealer Portal System
-- ==========================================

-- 1. Customer tier enum
CREATE TYPE public.customer_tier AS ENUM (
  'wholesale_tier1',
  'wholesale_tier2',
  'corporate',
  'retail'
);

-- 2. Application status enum
CREATE TYPE public.application_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'suspended'
);

-- 3. Client type enum
CREATE TYPE public.client_type AS ENUM (
  'wholesale',
  'company',
  'workshop',
  'distributor'
);

-- 4. App role enum for admin
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 5. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 6. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. Dealer applications table
CREATE TABLE public.dealer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  commercial_register_no TEXT NOT NULL,
  tax_card_no TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  governorate TEXT NOT NULL,
  detailed_address TEXT NOT NULL,
  client_type client_type NOT NULL,
  years_in_business INTEGER NOT NULL DEFAULT 0,
  avg_monthly_purchase TEXT,
  has_branches BOOLEAN DEFAULT false,
  coverage_areas TEXT,
  commercial_register_doc TEXT,
  tax_card_doc TEXT,
  national_id_doc TEXT,
  additional_docs TEXT[],
  status application_status NOT NULL DEFAULT 'pending',
  assigned_tier customer_tier,
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  agreed_pricing_policy BOOLEAN NOT NULL DEFAULT false,
  agreed_market_protection BOOLEAN NOT NULL DEFAULT false,
  agreed_return_policy BOOLEAN NOT NULL DEFAULT false,
  agreed_terms BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dealer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications" ON public.dealer_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create applications" ON public.dealer_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all applications" ON public.dealer_applications
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. Dealer accounts (approved dealers)
CREATE TABLE public.dealer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.dealer_applications(id),
  tier customer_tier NOT NULL DEFAULT 'retail',
  is_active BOOLEAN NOT NULL DEFAULT true,
  custom_discount NUMERIC(5,2) DEFAULT 0,
  min_order_amount NUMERIC(12,2) DEFAULT 0,
  credit_limit NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dealer_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dealer account" ON public.dealer_accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage dealer accounts" ON public.dealer_accounts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 9. Product categories
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.product_categories
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.product_categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 10. Product brands
CREATE TYPE public.product_brand AS ENUM ('toyota_genuine', 'toyota_oils', 'mtx_aftermarket');

-- 11. Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  brand product_brand NOT NULL,
  category_id UUID REFERENCES public.product_categories(id),
  image_url TEXT,
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_order_qty INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 12. Tier pricing table
CREATE TABLE public.product_tier_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tier customer_tier NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  min_qty_for_discount INTEGER DEFAULT 1,
  discount_price NUMERIC(12,2),
  UNIQUE(product_id, tier)
);
ALTER TABLE public.product_tier_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers can view tier prices" ON public.product_tier_prices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dealer_accounts
      WHERE user_id = auth.uid() AND is_active = true AND tier = product_tier_prices.tier
    )
  );
CREATE POLICY "Admins can manage tier prices" ON public.product_tier_prices
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 13. Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  shipping_address TEXT,
  shipping_governorate TEXT,
  payment_method TEXT,
  invoice_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage orders" ON public.orders
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 14. Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = auth.uid()));
CREATE POLICY "Users can create order items" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage order items" ON public.order_items
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 15. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dealer_applications_updated_at BEFORE UPDATE ON public.dealer_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dealer_accounts_updated_at BEFORE UPDATE ON public.dealer_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 16. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 17. Storage bucket for dealer documents
INSERT INTO storage.buckets (id, name, public) VALUES ('dealer-documents', 'dealer-documents', false);

CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dealer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'dealer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all dealer documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'dealer-documents' AND public.has_role(auth.uid(), 'admin'));

-- 18. Insert default product categories
INSERT INTO public.product_categories (name_ar, name_en, slug, sort_order) VALUES
  ('قطع المحرك', 'Engine Parts', 'engine', 1),
  ('العفشة والتعليق', 'Suspension', 'suspension', 2),
  ('الفلاتر', 'Filters', 'filters', 3),
  ('الكهرباء', 'Electrical', 'electrical', 4),
  ('التبريد', 'Cooling', 'cooling', 5);
