ALTER TABLE public.dealer_accounts ADD COLUMN erp_customer_code text;
CREATE INDEX idx_dealer_accounts_erp_code ON dealer_accounts(erp_customer_code) WHERE erp_customer_code IS NOT NULL;