-- Pricing formula settings:
-- final KZT price = ceil((price_usd * USD/KZT rate * (1 + margin_percent/100)) / 1000) * 1000

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS price_usd numeric(12,2),
  ADD COLUMN IF NOT EXISTS exchange_rate numeric(12,2),
  ADD COLUMN IF NOT EXISTS margin_percent numeric(6,2);

CREATE TABLE IF NOT EXISTS public.pricing_settings (
  id boolean PRIMARY KEY DEFAULT true,
  usd_kzt_rate numeric(12,2) NOT NULL DEFAULT 500 CHECK (usd_kzt_rate > 0),
  default_margin_percent numeric(6,2) NOT NULL DEFAULT 50 CHECK (default_margin_percent >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pricing_settings_singleton CHECK (id)
);

INSERT INTO public.pricing_settings (id, usd_kzt_rate, default_margin_percent)
VALUES (true, 500, 50)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.round_price_up_1000(value numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN value IS NULL OR value <= 0 THEN 0
    ELSE ceil(value / 1000) * 1000
  END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_kzt_price(
  price_usd numeric,
  usd_kzt_rate numeric,
  margin_percent numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.round_price_up_1000(price_usd * usd_kzt_rate * (1 + margin_percent / 100));
$$;

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pricing_settings_read ON public.pricing_settings;
CREATE POLICY pricing_settings_read ON public.pricing_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS pricing_settings_write ON public.pricing_settings;
CREATE POLICY pricing_settings_write ON public.pricing_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
