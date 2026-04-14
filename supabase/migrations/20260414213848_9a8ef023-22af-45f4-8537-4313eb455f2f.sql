-- Use DROP IF EXISTS + CREATE to ensure all triggers exist

-- Products triggers
DROP TRIGGER IF EXISTS trg_notify_stock_back ON public.products;
CREATE TRIGGER trg_notify_stock_back AFTER UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.notify_stock_back();

DROP TRIGGER IF EXISTS trg_notify_dealers_new_offer ON public.products;
CREATE TRIGGER trg_notify_dealers_new_offer AFTER UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.notify_dealers_new_offer();

DROP TRIGGER IF EXISTS trg_updated_at_products ON public.products;
CREATE TRIGGER trg_updated_at_products BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_audit_products ON public.products;
CREATE TRIGGER trg_audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.log_admin_audit();

-- Orders triggers
DROP TRIGGER IF EXISTS trg_notify_dealer_status_change ON public.orders;
CREATE TRIGGER trg_notify_dealer_status_change AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_dealer_status_change();

DROP TRIGGER IF EXISTS trg_notify_order_status_push ON public.orders;
CREATE TRIGGER trg_notify_order_status_push AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_push();

DROP TRIGGER IF EXISTS trg_notify_order_status_whatsapp ON public.orders;
CREATE TRIGGER trg_notify_order_status_whatsapp AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_whatsapp();

DROP TRIGGER IF EXISTS trg_notify_admins_new_order ON public.orders;
CREATE TRIGGER trg_notify_admins_new_order AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_order();

DROP TRIGGER IF EXISTS trg_protect_order_sensitive_fields ON public.orders;
CREATE TRIGGER trg_protect_order_sensitive_fields BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.protect_order_sensitive_fields();

DROP TRIGGER IF EXISTS trg_updated_at_orders ON public.orders;
CREATE TRIGGER trg_updated_at_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_audit_orders ON public.orders;
CREATE TRIGGER trg_audit_orders AFTER INSERT OR UPDATE OR DELETE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_admin_audit();

-- Order items triggers
DROP TRIGGER IF EXISTS trg_lock_dealer_product_after_order ON public.order_items;
CREATE TRIGGER trg_lock_dealer_product_after_order AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.lock_dealer_product_after_order();

DROP TRIGGER IF EXISTS trg_enforce_order_item_prices ON public.order_items;
CREATE TRIGGER trg_enforce_order_item_prices BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.enforce_order_item_prices();

DROP TRIGGER IF EXISTS trg_protect_order_item_prices ON public.order_items;
CREATE TRIGGER trg_protect_order_item_prices BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.protect_order_item_prices();

-- Price lists triggers
DROP TRIGGER IF EXISTS trg_notify_dealers_new_price_list ON public.price_lists;
CREATE TRIGGER trg_notify_dealers_new_price_list AFTER INSERT ON public.price_lists FOR EACH ROW EXECUTE FUNCTION public.notify_dealers_new_price_list();

DROP TRIGGER IF EXISTS trg_notify_pricelist_whatsapp ON public.price_lists;
CREATE TRIGGER trg_notify_pricelist_whatsapp AFTER INSERT ON public.price_lists FOR EACH ROW EXECUTE FUNCTION public.notify_pricelist_whatsapp();

-- Dealer accounts
DROP TRIGGER IF EXISTS trg_updated_at_dealer_accounts ON public.dealer_accounts;
CREATE TRIGGER trg_updated_at_dealer_accounts BEFORE UPDATE ON public.dealer_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_audit_dealer_accounts ON public.dealer_accounts;
CREATE TRIGGER trg_audit_dealer_accounts AFTER INSERT OR UPDATE OR DELETE ON public.dealer_accounts FOR EACH ROW EXECUTE FUNCTION public.log_admin_audit();

-- User roles audit
DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.log_admin_audit();

-- OTP hashing
DROP TRIGGER IF EXISTS trg_hash_otp_code ON public.otp_codes;
CREATE TRIGGER trg_hash_otp_code BEFORE INSERT ON public.otp_codes FOR EACH ROW EXECUTE FUNCTION public.hash_otp_code();

-- Search log notification
DROP TRIGGER IF EXISTS trg_notify_admin_high_search ON public.customer_search_logs;
CREATE TRIGGER trg_notify_admin_high_search AFTER INSERT ON public.customer_search_logs FOR EACH ROW EXECUTE FUNCTION public.notify_admin_high_search_no_orders();