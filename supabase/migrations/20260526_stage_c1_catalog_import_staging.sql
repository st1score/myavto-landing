-- =====================================================================
-- Stage C1: catalog import staging layer
--
-- Adds a safe inbound pipeline for data from external sources
-- (Otoba.ru, TEIKIN/NPR/KP/Taiho PDFs, supplier CSV, manual Excel,
-- AI/n8n extractions). Nothing from this layer writes to master tables
-- automatically — every row goes through batch → parse → normalize →
-- review → approve before any INSERT into engine_fitments,
-- part_number_crosses, engine_part_numbers, etc.
--
-- Additive-only. Idempotent. Safe to re-run.
--
-- DOES NOT TOUCH:
--   * existing tables (engines, brands, part_*, stock_items, …)
--   * Stage A tables (vehicle_*, engine_fitments, data_sources, …)
--   * Stage B1 (products, sales_channels)
--   * Stage B3 (media_assets, engine_media, product_media)
--
-- engine_code / vehicle_make / vehicle_model on staging rows are plain
-- text (no FK) — staging holds raw, possibly invalid values until
-- normalization decides what they map to.
--
-- No GRANT / RLS in this migration.
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1) catalog_import_batches
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.catalog_import_batches (
  id              bigserial PRIMARY KEY,
  source_id       bigint NOT NULL REFERENCES public.data_sources(id),
  source_run_id   bigint NULL    REFERENCES public.data_source_runs(id),
  batch_code      text NOT NULL UNIQUE,
  import_type     text NOT NULL,
  status          text NOT NULL DEFAULT 'draft',
  file_name       text NULL,
  source_url      text NULL,
  parser_name     text NULL,
  parser_version  text NULL,
  rows_total      int  NOT NULL DEFAULT 0,
  rows_parsed     int  NOT NULL DEFAULT 0,
  rows_normalized int  NOT NULL DEFAULT 0,
  rows_approved   int  NOT NULL DEFAULT 0,
  rows_imported   int  NOT NULL DEFAULT 0,
  rows_failed     int  NOT NULL DEFAULT 0,
  notes           text NULL,
  meta_json       jsonb NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_import_batches_import_type_chk CHECK (import_type IN (
    'otoba_fitment',
    'teikin_pistons',
    'npr_rings',
    'kp_rings',
    'taiho_bearings',
    'supplier_csv',
    'manual_excel',
    'ai_extraction',
    'other'
  )),
  CONSTRAINT catalog_import_batches_status_chk CHECK (status IN (
    'draft',
    'parsing',
    'parsed',
    'normalizing',
    'normalized',
    'needs_review',
    'approved',
    'importing',
    'imported',
    'partial_import',
    'failed',
    'archived'
  ))
);

DROP TRIGGER IF EXISTS trg_catalog_import_batches_touch ON public.catalog_import_batches;
CREATE TRIGGER trg_catalog_import_batches_touch
  BEFORE UPDATE ON public.catalog_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_catalog_import_batches_source_id   ON public.catalog_import_batches (source_id);
CREATE INDEX IF NOT EXISTS idx_catalog_import_batches_batch_code  ON public.catalog_import_batches (batch_code);
CREATE INDEX IF NOT EXISTS idx_catalog_import_batches_import_type ON public.catalog_import_batches (import_type);
CREATE INDEX IF NOT EXISTS idx_catalog_import_batches_status      ON public.catalog_import_batches (status);

-- =====================================================================
-- 2) catalog_import_rows
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.catalog_import_rows (
  id                   bigserial PRIMARY KEY,
  batch_id             bigint NOT NULL REFERENCES public.catalog_import_batches(id) ON DELETE CASCADE,
  row_number           int    NOT NULL,
  source_page          text NULL,
  source_url           text NULL,
  raw_text             text NULL,
  raw_json             jsonb NULL,
  normalized_json      jsonb NULL,
  detected_entity_type text NULL,
  engine_code          text NULL,
  category_code        text NULL REFERENCES public.part_categories(code),
  part_number          text NULL,
  brand_name           text NULL,
  vehicle_make         text NULL,
  vehicle_model        text NULL,
  confidence           numeric(3,2) NOT NULL DEFAULT 0.50,
  status               text NOT NULL DEFAULT 'parsed',
  error_text           text NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_import_rows_confidence_chk
    CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT catalog_import_rows_status_chk CHECK (status IN (
    'parsed',
    'normalized',
    'needs_review',
    'approved',
    'rejected',
    'imported',
    'error',
    'duplicate'
  ))
);

DROP TRIGGER IF EXISTS trg_catalog_import_rows_touch ON public.catalog_import_rows;
CREATE TRIGGER trg_catalog_import_rows_touch
  BEFORE UPDATE ON public.catalog_import_rows
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_import_rows_batch_row
  ON public.catalog_import_rows (batch_id, row_number);

CREATE INDEX IF NOT EXISTS idx_catalog_import_rows_batch_id              ON public.catalog_import_rows (batch_id);
CREATE INDEX IF NOT EXISTS idx_catalog_import_rows_status               ON public.catalog_import_rows (status);
CREATE INDEX IF NOT EXISTS idx_catalog_import_rows_engine_code          ON public.catalog_import_rows (engine_code);
CREATE INDEX IF NOT EXISTS idx_catalog_import_rows_category_code        ON public.catalog_import_rows (category_code);
CREATE INDEX IF NOT EXISTS idx_catalog_import_rows_detected_entity_type ON public.catalog_import_rows (detected_entity_type);
CREATE INDEX IF NOT EXISTS idx_catalog_import_rows_raw_json_gin
  ON public.catalog_import_rows USING gin (raw_json);
CREATE INDEX IF NOT EXISTS idx_catalog_import_rows_normalized_json_gin
  ON public.catalog_import_rows USING gin (normalized_json);

-- =====================================================================
-- 3) catalog_import_decisions
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.catalog_import_decisions (
  id                bigserial PRIMARY KEY,
  import_row_id     bigint NOT NULL REFERENCES public.catalog_import_rows(id) ON DELETE CASCADE,
  decision          text NOT NULL,
  target_table      text NULL,
  target_entity_key text NULL,
  target_id         bigint NULL,
  decided_by        text NULL,
  notes             text NULL,
  decided_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_import_decisions_decision_chk CHECK (decision IN (
    'approve',
    'reject',
    'merge',
    'skip',
    'needs_manual_review'
  ))
);

CREATE INDEX IF NOT EXISTS idx_catalog_import_decisions_row_id    ON public.catalog_import_decisions (import_row_id);
CREATE INDEX IF NOT EXISTS idx_catalog_import_decisions_decision  ON public.catalog_import_decisions (decision);

-- =====================================================================
-- 4) catalog_import_mappings
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.catalog_import_mappings (
  id                  bigserial PRIMARY KEY,
  source_id           bigint NOT NULL REFERENCES public.data_sources(id),
  import_type         text NOT NULL,
  source_field        text NOT NULL,
  target_entity_type  text NOT NULL,
  target_field        text NOT NULL,
  transform_rule      text NULL,
  is_required         boolean NOT NULL DEFAULT false,
  is_active           boolean NOT NULL DEFAULT true,
  notes               text NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_catalog_import_mappings_touch ON public.catalog_import_mappings;
CREATE TRIGGER trg_catalog_import_mappings_touch
  BEFORE UPDATE ON public.catalog_import_mappings
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_import_mappings_natural
  ON public.catalog_import_mappings (
    source_id, import_type, source_field, target_entity_type, target_field
  );

CREATE INDEX IF NOT EXISTS idx_catalog_import_mappings_source_type
  ON public.catalog_import_mappings (source_id, import_type);
CREATE INDEX IF NOT EXISTS idx_catalog_import_mappings_target
  ON public.catalog_import_mappings (target_entity_type, target_field);

-- =====================================================================
-- 5) Record migration
-- =====================================================================
INSERT INTO public._migrations_applied (filename)
VALUES ('20260526_stage_c1_catalog_import_staging.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
