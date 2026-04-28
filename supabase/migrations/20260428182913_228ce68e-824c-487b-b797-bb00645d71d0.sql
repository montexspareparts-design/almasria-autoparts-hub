WITH ranked AS (
  SELECT id, phone,
    ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at ASC) AS rn
  FROM public.visitor_leads
  WHERE phone IS NOT NULL
)
DELETE FROM public.visitor_leads
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS visitor_leads_phone_unique_idx
  ON public.visitor_leads (phone);