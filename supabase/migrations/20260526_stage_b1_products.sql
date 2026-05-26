-- =====================================================================
-- Stage B1: sales_channels + products + stable SKU
--
-- Additive-only. Idempotent. Safe to re-run.
--
-- DOES NOT TOUCH:
--   * existing tables (engines, brands, part_*, stock_items, size_codes,
--     warehouses, attributes, category_attributes, etc.)
--   * Stage A tables (vehicle_*, engine_fitments, data_sources, etc.)
--
-- products.engine_code is plain text (no FK) — engines has composite PK
-- (brand_name, engine_code). FK to engines is intentionally deferred.
--
-- No GRANT / RLS statements. Access policy is decided in a separate
-- security stage.
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1) sales_channels
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.sales_channels (
  code             text PRIMARY KEY,
  name             text NOT NULL,
  kind             text NOT NULL,
  currency_default text NOT NULL DEFAULT 'KZT',
  locale_default   text NOT NULL DEFAULT 'ru',
  notes            text NULL,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_channels_kind_chk CHECK (kind IN (
    'site',
    'marketplace',
    'ads',
    'bot',
    'internal',
    'price_type',
    'automation'
  ))
);

DROP TRIGGER IF EXISTS trg_sales_channels_touch ON public.sales_channels;
CREATE TRIGGER trg_sales_channels_touch
  BEFORE UPDATE ON public.sales_channels
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- =====================================================================
-- 2) SKU helper functions
-- =====================================================================

-- 2.1 normalize_sku_part: upper, [^A-Z0-9]→'-', collapse '-', trim '-'
CREATE OR REPLACE FUNCTION public.normalize_sku_part(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text;
BEGIN
  IF input IS NULL THEN
    RETURN 'NA';
  END IF;
  s := upper(input);
  s := regexp_replace(s, '[^A-Z0-9]+', '-', 'g');
  s := regexp_replace(s, '-+', '-', 'g');
  s := btrim(s, '-');
  IF s = '' THEN
    RETURN 'NA';
  END IF;
  RETURN s;
END;
$$;

-- 2.2 size_code_to_sku
CREATE OR REPLACE FUNCTION public.size_code_to_sku(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE upper(coalesce(input, ''))
    WHEN 'STD'  THEN 'STD'
    WHEN '0.25' THEN '025'
    WHEN '0.50' THEN '050'
    WHEN '0.75' THEN '075'
    WHEN '1.00' THEN '100'
    ELSE public.normalize_sku_part(input)
  END;
END;
$$;

-- 2.3 category_code_to_sku
CREATE OR REPLACE FUNCTION public.category_code_to_sku(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE upper(coalesce(input, ''))
    WHEN 'PISTON'       THEN 'PSTN'
    WHEN 'RING'         THEN 'RING'
    WHEN 'LINER'        THEN 'LIN'
    WHEN 'BEARING'      THEN 'BRG'
    WHEN 'TIMING_BELT'  THEN 'TBLT'
    WHEN 'WATER_PUMP'   THEN 'WPMP'
    WHEN 'GASKET_KIT'   THEN 'GSKT'
    ELSE public.normalize_sku_part(input)
  END;
END;
$$;

-- 2.4 generate_product_sku
-- Format: MYA-{ENGINE}-{CAT}-{BRAND}-{VARIANT}[-{INSERT}]-{SIZE}
-- INSERT segment is omitted when insert_type = 'plain'.
CREATE OR REPLACE FUNCTION public.generate_product_sku(
  p_engine_code  text,
  p_category     text,
  p_brand_name   text,
  p_variant_name text,
  p_insert_type  text,
  p_size_code    text
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_engine  text := public.normalize_sku_part(p_engine_code);
  v_cat     text := public.category_code_to_sku(p_category);
  v_brand   text := public.normalize_sku_part(p_brand_name);
  v_variant text := public.normalize_sku_part(p_variant_name);
  v_insert  text := upper(coalesce(p_insert_type, 'plain'));
  v_size    text := public.size_code_to_sku(p_size_code);
BEGIN
  IF v_insert = 'PLAIN' OR v_insert = '' THEN
    RETURN concat_ws('-', 'MYA', v_engine, v_cat, v_brand, v_variant, v_size);
  ELSE
    RETURN concat_ws('-', 'MYA', v_engine, v_cat, v_brand, v_variant, v_insert, v_size);
  END IF;
END;
$$;

-- =====================================================================
-- 3) products
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id            bigserial PRIMARY KEY,
  sku           text NOT NULL UNIQUE,
  engine_code   text NOT NULL,
  category_code text NOT NULL REFERENCES public.part_categories(code),
  part_name     text NOT NULL,
  brand_name    text NOT NULL REFERENCES public.brands(name),
  variant_name  text NOT NULL,
  insert_type   text NOT NULL DEFAULT 'plain',
  size_code     text NOT NULL REFERENCES public.size_codes(code),
  kind          text NOT NULL DEFAULT 'single',
  barcode       text NULL,
  weight_g      int  NULL,
  volume_ml     int  NULL,
  source_id     bigint NULL REFERENCES public.data_sources(id),
  confidence    numeric(3,2) NOT NULL DEFAULT 1.00,
  notes         text NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_confidence_chk CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT products_insert_type_chk CHECK (insert_type IN ('plain','A','AG')),
  CONSTRAINT products_kind_chk        CHECK (kind IN ('single','kit','bundle'))
);

-- Natural-key uniqueness — mirrors part_variant_sizes natural key
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_natural
  ON public.products (
    engine_code, category_code, part_name, brand_name, variant_name, size_code, insert_type
  );

-- Lookup indexes
CREATE INDEX IF NOT EXISTS idx_products_sku                 ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_products_engine_code         ON public.products (engine_code);
CREATE INDEX IF NOT EXISTS idx_products_category_code       ON public.products (category_code);
CREATE INDEX IF NOT EXISTS idx_products_brand_name          ON public.products (brand_name);
CREATE INDEX IF NOT EXISTS idx_products_size_code           ON public.products (size_code);
CREATE INDEX IF NOT EXISTS idx_products_engine_category     ON public.products (engine_code, category_code);
CREATE INDEX IF NOT EXISTS idx_products_is_active           ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_source_id           ON public.products (source_id);

-- =====================================================================
-- 4) Triggers on products
-- =====================================================================

-- 4.1 BEFORE INSERT: auto-fill sku if missing
CREATE OR REPLACE FUNCTION public.tg_products_fill_sku()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sku IS NULL OR btrim(NEW.sku) = '' THEN
    NEW.sku := public.generate_product_sku(
      NEW.engine_code,
      NEW.category_code,
      NEW.brand_name,
      NEW.variant_name,
      NEW.insert_type,
      NEW.size_code
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_fill_sku ON public.products;
CREATE TRIGGER trg_products_fill_sku
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_products_fill_sku();

-- 4.2 BEFORE UPDATE: forbid sku change (sku is immutable contract)
CREATE OR REPLACE FUNCTION public.tg_products_immutable_sku()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sku IS DISTINCT FROM OLD.sku THEN
    RAISE EXCEPTION 'products.sku is immutable (was %, attempted %)', OLD.sku, NEW.sku
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_immutable_sku ON public.products;
CREATE TRIGGER trg_products_immutable_sku
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_products_immutable_sku();

-- 4.3 BEFORE UPDATE: touch updated_at (Stage A function)
DROP TRIGGER IF EXISTS trg_products_touch ON public.products;
CREATE TRIGGER trg_products_touch
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- =====================================================================
-- 5) Record migration
-- =====================================================================
INSERT INTO public._migrations_applied (filename)
VALUES ('20260526_stage_b1_products.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
