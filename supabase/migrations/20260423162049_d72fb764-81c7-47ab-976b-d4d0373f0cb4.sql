-- Translations table for editable UI strings
CREATE TABLE public.ui_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value_ar TEXT NOT NULL DEFAULT '',
  value_en TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ui_translations_category ON public.ui_translations(category);
CREATE INDEX idx_ui_translations_key ON public.ui_translations(key);

ALTER TABLE public.ui_translations ENABLE ROW LEVEL SECURITY;

-- Anyone can read translations (used by public site)
CREATE POLICY "Anyone can view translations"
ON public.ui_translations
FOR SELECT
USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage translations"
ON public.ui_translations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update timestamp
CREATE TRIGGER update_ui_translations_updated_at
BEFORE UPDATE ON public.ui_translations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();