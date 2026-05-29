-- =====================================================================
-- Stage B2: prices (multi-channel, windowed)
--
-- Additive-only. Idempotent. Safe to re-run.
--
-- Depends on: Stage B1 (products, sales_channels), Stage A (tg_touch_updated_at).
--
-- A price is (product_id, channel_code, currency, valid_from, valid_to).
-- Overlapping intervals for the same (product, channel, currency) are
-- forbidden via an exclusion constraint.
--
-- Active price at moment T = the row whose [valid_from, valid_to) contains T.
-- valid_to = NULL means "open ended / current".
--
-- No GRANT / RLS — security stage handles that.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.prices (
  id            bigserial PRIMARY KEY,
  product_id    bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  channel_code  text   NOT NULL REFERENCES public.sales_channels(code) ON DELETE RESTRICT,
  currency      text   NOT NULL DEFAULT 'KZT',
  amount        numeric(12,2) NOT NULL CHECK (amount >= 0),
  compare_at    numeric(12,2) NULL CHECK (compare_at IS NULL OR compare_at >= 0),
  cost          numeric(12,2) NULL CHECK (cost IS NULL OR cost >= 0),
  valid_from    timestamptz NOT NULL DEFAULT now(),
  valid_to      timestamptz NULL,
  notes         text NULL,
  source_id     bigint NULL REFERENCES public.data_sources(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prices_window_chk CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT prices_currency_chk CHECK (currency IN ('KZT','USD','EUR','RUB','CNY'))
);

-- Prevent overlapping intervals for same (product, channel, currency).
-- tstzrange with [) semantics; NULL valid_to → 'infinity'.
ALTER TABLE public.prices
  DROP CONSTRAINT IF EXISTS prices_no_overlap;
ALTER TABLE public.prices
  ADD CONSTRAINT prices_no_overlap EXCLUDE USING gist (
    product_id  WITH =,
    channel_code WITH =,
    currency    WITH =,
    tstzrange(valid_from, COALESCE(valid_to, 'infinity'::timestamptz), '[)') WITH &&
  );

CREATE INDEX IF NOT EXISTS idx_prices_product ON public.prices(product_id);
CREATE INDEX IF NOT EXISTS idx_prices_channel_active
  ON public.prices(channel_code, currency)
  WHERE valid_to IS NULL;

DROP TRIGGER IF EXISTS trg_prices_touch ON public.prices;
CREATE TRIGGER trg_prices_touch
  BEFORE UPDATE ON public.prices
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Convenience view: current price per (product, channel, currency).
CREATE OR REPLACE VIEW public.v_current_prices AS
SELECT DISTINCT ON (product_id, channel_code, currency)
  product_id,
  channel_code,
  currency,
  amount,
  compare_at,
  cost,
  valid_from,
  valid_to
FROM public.prices
WHERE valid_from <= now()
  AND (valid_to IS NULL OR valid_to > now())
ORDER BY product_id, channel_code, currency, valid_from DESC;

COMMIT;
