-- Add audit triggers on additional sensitive tables so every staff action is recorded
DO $$
DECLARE
  _tbl text;
  _tables text[] := ARRAY[
    'catalogs',
    'price_lists',
    'maintenance_bundles',
    'bundle_items',
    'quantity_discounts',
    'product_categories',
    'admin_notification_phones',
    'daily_report_questions'
  ];
BEGIN
  FOREACH _tbl IN ARRAY _tables LOOP
    -- Drop existing trigger if any to keep migration idempotent
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', _tbl, _tbl);
    EXECUTE format(
      'CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_admin_audit()',
      _tbl, _tbl
    );
  END LOOP;
END $$;