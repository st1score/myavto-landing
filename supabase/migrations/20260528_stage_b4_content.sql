-- =====================================================================
-- Stage B4: content (product_content + engine_content)
--
-- Additive-only. Idempotent. Safe to re-run.
--
-- Depends on: Stage B1 (products, sales_channels), Stage A
-- (tg_touch_updated_at, engines may be referenced by code only).
--
-- One row per (entity, locale, channel_code). channel_code = NULL means
-- "default for all channels" (fallback). Channel-specific row overrides.
--
-- Locale uses BCP-47 short codes: ru, kz, en, ...
--
-- No GRANT / RLS — security stage handles that.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.product_content (
  id            bigserial PRIMARY KEY,
  product_id    bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  locale        text   NOT NULL DEFAULT 'ru',
  channel_code  text   NULL REFERENCES public.sales_channels(code) ON DELETE CASCADE,
  title         text   NULL,
  short_desc    text   NULL,
  description   text   NULL,
  features      jsonb  NOT NULL DEFAULT '[]'::jsonb,
  seo_title     text   NULL,
  seo_desc      text   NULL,
  seo_keywords  text[] NULL,
  is_published  boolean NOT NULL DEFAULT true,
  source_id     bigint NULL REFERENCES public.data_sources(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_content_locale_chk CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$')
);

-- Partial unique: one default-channel row + one row per explicit channel per (product, locale).
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_content_default
  ON public.product_content(product_id, locale)
  WHERE channel_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_content_channel
  ON public.product_content(product_id, locale, channel_code)
  WHERE channel_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_content_product ON public.product_content(product_id);

DROP TRIGGER IF EXISTS trg_product_content_touch ON public.product_content;
CREATE TRIGGER trg_product_content_touch
  BEFORE UPDATE ON public.product_content
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.engine_content (
  id            bigserial PRIMARY KEY,
  engine_code   text   NOT NULL,
  locale        text   NOT NULL DEFAULT 'ru',
  channel_code  text   NULL REFERENCES public.sales_channels(code) ON DELETE CASCADE,
  title         text   NULL,
  short_desc    text   NULL,
  description   text   NULL,
  seo_title     text   NULL,
  seo_desc      text   NULL,
  seo_keywords  text[] NULL,
  is_published  boolean NOT NULL DEFAULT true,
  source_id     bigint NULL REFERENCES public.data_sources(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT engine_content_locale_chk CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_engine_content_default
  ON public.engine_content(engine_code, locale)
  WHERE channel_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_engine_content_channel
  ON public.engine_content(engine_code, locale, channel_code)
  WHERE channel_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_engine_content_engine ON public.engine_content(engine_code);

DROP TRIGGER IF EXISTS trg_engine_content_touch ON public.engine_content;
CREATE TRIGGER trg_engine_content_touch
  BEFORE UPDATE ON public.engine_content
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

COMMIT;
