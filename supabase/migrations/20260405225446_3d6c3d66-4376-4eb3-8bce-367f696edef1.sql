ALTER TABLE public.products 
ADD COLUMN safety_stock integer NOT NULL DEFAULT 0,
ADD COLUMN max_order_cap integer DEFAULT NULL;