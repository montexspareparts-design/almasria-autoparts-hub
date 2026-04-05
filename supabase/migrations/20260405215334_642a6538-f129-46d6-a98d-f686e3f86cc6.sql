
CREATE TRIGGER trg_notify_dealers_new_offer
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dealers_new_offer();

CREATE TRIGGER trg_notify_dealers_new_price_list
  AFTER INSERT ON public.price_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dealers_new_price_list();
