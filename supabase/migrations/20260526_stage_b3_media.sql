-- =====================================================================
-- Stage B3: media layer (media_assets + engine_media + product_media)
--
-- Additive-only. Idempotent. Safe to re-run.
--
-- DOES NOT TOUCH:
--   * existing tables (engines, brands, part_*, stock_items, …)
--   * Stage A tables (vehicle_*, engine_fitments, data_sources, …)
--   * Stage B1 (products, sales_channels) — only READS via FK
--
-- engine_media.engine_code is plain text (no FK) — engines has
-- composite PK (brand_name, engine_code).
--
-- No GRANT / RLS in this migration.
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1) media_assets
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.media_assets (
  id            bigserial PRIMARY KEY,
  url           text NOT NULL,
  storage_path  text NULL,
  media_type    text NOT NULL,
  mime_type     text NULL,
  alt_text      text NULL,
  width         int  NULL,
  height        int  NULL,
  bytes         int  NULL,
  sha256        text NULL,
  source_id     bigint NULL REFERENCES public.data_sources(id),
  confidence    numeric(3,2) NOT NULL DEFAULT 1.00,
  notes         text NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_assets_media_type_chk
    CHECK (media_type IN ('image','pdf','video','doc','3d')),
  CONSTRAINT media_assets_confidence_chk
    CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT media_assets_width_chk  CHECK (width  IS NULL OR width  > 0),
  CONSTRAINT media_assets_height_chk CHECK (height IS NULL OR height > 0),
  CONSTRAINT media_assets_bytes_chk  CHECK (bytes  IS NULL OR bytes  > 0)
);

-- Dedup by URL — lets the seed use ON CONFLICT (url) DO NOTHING.
CREATE UNIQUE INDEX IF NOT EXISTS uq_media_assets_url
  ON public.media_assets (url);

CREATE INDEX IF NOT EXISTS idx_media_assets_storage_path
  ON public.media_assets (storage_path);
CREATE INDEX IF NOT EXISTS idx_media_assets_media_type
  ON public.media_assets (media_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_source_id
  ON public.media_assets (source_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_sha256
  ON public.media_assets (sha256)
  WHERE sha256 IS NOT NULL;

DROP TRIGGER IF EXISTS trg_media_assets_touch ON public.media_assets;
CREATE TRIGGER trg_media_assets_touch
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- =====================================================================
-- 2) engine_media
--
-- engine_code is plain text (no FK to engines — composite PK blocker).
-- PK = (engine_code, media_id, role). Partial UNIQUE enforces at most
-- one role='catalog' image per engine.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.engine_media (
  engine_code text NOT NULL,
  media_id    bigint NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  role        text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  notes       text NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (engine_code, media_id, role),
  CONSTRAINT engine_media_role_chk
    CHECK (role IN ('catalog','schema','cross_section','photo'))
);

CREATE INDEX IF NOT EXISTS idx_engine_media_engine_code ON public.engine_media (engine_code);
CREATE INDEX IF NOT EXISTS idx_engine_media_media_id    ON public.engine_media (media_id);

-- At most one catalog image per engine.
CREATE UNIQUE INDEX IF NOT EXISTS uq_engine_media_one_catalog
  ON public.engine_media (engine_code)
  WHERE role = 'catalog';

-- =====================================================================
-- 3) product_media
--
-- PK = (product_id, media_id, role). Partial UNIQUE enforces at most
-- one role='primary' image per product.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.product_media (
  product_id bigint NOT NULL REFERENCES public.products(id)      ON DELETE CASCADE,
  media_id   bigint NOT NULL REFERENCES public.media_assets(id)  ON DELETE CASCADE,
  role       text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  notes      text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, media_id, role),
  CONSTRAINT product_media_role_chk
    CHECK (role IN ('primary','gallery','spec_sheet','install_diagram','box'))
);

CREATE INDEX IF NOT EXISTS idx_product_media_product_id ON public.product_media (product_id);
CREATE INDEX IF NOT EXISTS idx_product_media_media_id   ON public.product_media (media_id);

-- At most one primary image per product.
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_media_one_primary
  ON public.product_media (product_id)
  WHERE role = 'primary';

-- =====================================================================
-- 4) Record migration
-- =====================================================================
INSERT INTO public._migrations_applied (filename)
VALUES ('20260526_stage_b3_media.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
