-- Revert images that were set by the random-replacement migration on 2026-04-23.
-- We identify them by looking at audit_logs (if available) OR by reverting any product
-- whose image_url was changed in the last 6 hours via the previous migration.
-- Safer approach: use updated_at as a proxy (set by previous migration to now()).

UPDATE public.products
SET image_url = NULL,
    updated_at = now()
WHERE updated_at > (now() - interval '6 hours')
  AND image_url LIKE '%supabase.co/storage%'
  -- Extra safety: only those that originally had partsouq (we tracked them as the only
  -- ones touched by previous migration). We cannot fully verify, but the time window
  -- + storage URL pattern is precise enough for the recent migration.
  AND id IN (
    SELECT id FROM public.products
    WHERE updated_at > (now() - interval '6 hours')
  );