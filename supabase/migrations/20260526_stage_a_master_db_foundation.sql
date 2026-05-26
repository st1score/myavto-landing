-- =====================================================================
-- Stage A: Master DB foundation for MY AVTO
--
-- Adds vehicles + provenance + audit + aliases + cross-references on top
-- of the EXISTING database. Pure additive. Re-runnable.
--
-- DOES NOT TOUCH existing tables:
--   engines, brands, part_categories, attributes, category_attributes,
--   engine_parts, engine_part_numbers, engine_part_attribute_values,
--   part_variants, part_variant_sizes, stock_items, size_codes,
--   warehouses, v_piston_card
--
-- engine_code in new tables is plain text (no FK) because public.engines
-- has a composite PK (brand_name, engine_code). FK can be added later.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Shared trigger function for updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- PROVENANCE LAYER
-- =====================================================================

-- ---------------------------------------------------------------------
-- 6. data_sources
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_sources (
  id          bigserial PRIMARY KEY,
  code        text NOT NULL UNIQUE,
  name        text NOT NULL,
  source_type text NOT NULL,
  brand_name  text NULL,
  url         text NULL,
  file_name   text NULL,
  version     text NULL,
  language    text NULL,
  notes       text NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT data_sources_source_type_chk CHECK (source_type IN (
    'pdf_catalog',
    'website',
    'supplier_csv',
    'manual',
    'parser',
    'api',
    'n8n',
    'ai_generated',
    'existing_database'
  ))
);

DROP TRIGGER IF EXISTS trg_data_sources_touch ON public.data_sources;
CREATE TRIGGER trg_data_sources_touch
  BEFORE UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_data_sources_code        ON public.data_sources (code);
CREATE INDEX IF NOT EXISTS idx_data_sources_source_type ON public.data_sources (source_type);

-- ---------------------------------------------------------------------
-- 7. data_source_runs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_source_runs (
  id             bigserial PRIMARY KEY,
  source_id      bigint NOT NULL REFERENCES public.data_sources(id),
  run_type       text   NOT NULL,
  status         text   NOT NULL DEFAULT 'pending',
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz NULL,
  rows_total     int NOT NULL DEFAULT 0,
  rows_inserted  int NOT NULL DEFAULT 0,
  rows_updated   int NOT NULL DEFAULT 0,
  rows_failed    int NOT NULL DEFAULT 0,
  error_text     text NULL,
  meta_json      jsonb NULL,
  CONSTRAINT data_source_runs_status_chk CHECK (status IN (
    'pending','running','success','partial_success','failed'
  )),
  CONSTRAINT data_source_runs_finished_chk
    CHECK (finished_at IS NULL OR finished_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_data_source_runs_source_started
  ON public.data_source_runs (source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_source_runs_status
  ON public.data_source_runs (status);

-- ---------------------------------------------------------------------
-- 8. data_source_links
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_source_links (
  id            bigserial PRIMARY KEY,
  source_id     bigint NOT NULL REFERENCES public.data_sources(id),
  source_run_id bigint NULL    REFERENCES public.data_source_runs(id),
  entity_type   text   NOT NULL,
  entity_key    text   NOT NULL,
  source_page   text   NULL,
  source_url    text   NULL,
  raw_text      text   NULL,
  raw_json      jsonb  NULL,
  confidence    numeric(3,2) NOT NULL DEFAULT 1.00,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT data_source_links_confidence_chk
    CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_data_source_links_entity
  ON public.data_source_links (entity_type, entity_key);
CREATE INDEX IF NOT EXISTS idx_data_source_links_source
  ON public.data_source_links (source_id);
CREATE INDEX IF NOT EXISTS idx_data_source_links_source_run
  ON public.data_source_links (source_run_id);
CREATE INDEX IF NOT EXISTS idx_data_source_links_raw_json_gin
  ON public.data_source_links USING gin (raw_json);

-- Dedup: same source+run+entity+page+url should not be inserted twice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_data_source_links_dedup
  ON public.data_source_links (
    source_id,
    COALESCE(source_run_id, 0),
    entity_type,
    entity_key,
    COALESCE(source_page, ''),
    COALESCE(source_url,  '')
  );

-- ---------------------------------------------------------------------
-- 9. audit_log  (no triggers attached on existing tables in this stage)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id            bigserial PRIMARY KEY,
  table_name    text NOT NULL,
  operation     text NOT NULL,
  pk_json       jsonb NOT NULL,
  old_row       jsonb NULL,
  new_row       jsonb NULL,
  changed_by    text NULL,
  source_id     bigint NULL REFERENCES public.data_sources(id),
  source_run_id bigint NULL REFERENCES public.data_source_runs(id),
  changed_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_operation_chk CHECK (operation IN ('INSERT','UPDATE','DELETE'))
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_changed
  ON public.audit_log (table_name, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_pk_json_gin
  ON public.audit_log USING gin (pk_json);
CREATE INDEX IF NOT EXISTS idx_audit_log_source
  ON public.audit_log (source_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_source_run
  ON public.audit_log (source_run_id);

-- =====================================================================
-- VEHICLES LAYER
-- =====================================================================

-- ---------------------------------------------------------------------
-- 2. vehicle_makes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_makes (
  code       text PRIMARY KEY,
  name       text NOT NULL,
  country    text NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_vehicle_makes_touch ON public.vehicle_makes;
CREATE TRIGGER trg_vehicle_makes_touch
  BEFORE UPDATE ON public.vehicle_makes
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- ---------------------------------------------------------------------
-- 3. vehicle_models
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_models (
  id           bigserial PRIMARY KEY,
  make_code    text NOT NULL REFERENCES public.vehicle_makes(code),
  model_name   text NOT NULL,
  generation   text NULL,
  body_code    text NULL,
  chassis_code text NULL,
  year_from    int  NULL,
  year_to      int  NULL,
  region       text NULL,
  notes        text NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_models_year_range_chk
    CHECK (year_from IS NULL OR year_to IS NULL OR year_from <= year_to)
);

DROP TRIGGER IF EXISTS trg_vehicle_models_touch ON public.vehicle_models;
CREATE TRIGGER trg_vehicle_models_touch
  BEFORE UPDATE ON public.vehicle_models
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_vehicle_models_make_code    ON public.vehicle_models (make_code);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_model_name   ON public.vehicle_models (model_name);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_body_code    ON public.vehicle_models (body_code);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_chassis_code ON public.vehicle_models (chassis_code);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_models_natural
  ON public.vehicle_models (
    make_code,
    model_name,
    COALESCE(generation,   ''),
    COALESCE(chassis_code, ''),
    COALESCE(body_code,    ''),
    COALESCE(region,       '')
  );

-- ---------------------------------------------------------------------
-- 4. engine_fitments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engine_fitments (
  id               bigserial PRIMARY KEY,
  engine_code      text NOT NULL,
  vehicle_model_id bigint NOT NULL REFERENCES public.vehicle_models(id),
  year_from        int  NULL,
  year_to          int  NULL,
  region           text NULL,
  notes            text NULL,
  source_id        bigint NULL REFERENCES public.data_sources(id),
  confidence       numeric(3,2) NOT NULL DEFAULT 1.00,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT engine_fitments_confidence_chk
    CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT engine_fitments_year_range_chk
    CHECK (year_from IS NULL OR year_to IS NULL OR year_from <= year_to)
);

DROP TRIGGER IF EXISTS trg_engine_fitments_touch ON public.engine_fitments;
CREATE TRIGGER trg_engine_fitments_touch
  BEFORE UPDATE ON public.engine_fitments
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_engine_fitments_engine_code
  ON public.engine_fitments (engine_code);
CREATE INDEX IF NOT EXISTS idx_engine_fitments_vehicle_model_id
  ON public.engine_fitments (vehicle_model_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_engine_fitments_natural
  ON public.engine_fitments (
    engine_code,
    vehicle_model_id,
    COALESCE(year_from, -1),
    COALESCE(year_to,   -1),
    COALESCE(region,    '')
  );

-- ---------------------------------------------------------------------
-- 5. vehicle_specs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_specs (
  id               bigserial PRIMARY KEY,
  vehicle_model_id bigint NOT NULL REFERENCES public.vehicle_models(id),
  spec_code        text   NOT NULL,
  value_text       text   NULL,
  value_number     numeric NULL,
  unit             text   NULL,
  source_id        bigint NULL REFERENCES public.data_sources(id),
  confidence       numeric(3,2) NOT NULL DEFAULT 1.00,
  notes            text   NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_specs_confidence_chk
    CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_specs_vehicle_model_id
  ON public.vehicle_specs (vehicle_model_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_specs_spec_code
  ON public.vehicle_specs (spec_code);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_specs_natural
  ON public.vehicle_specs (
    vehicle_model_id,
    spec_code,
    COALESCE(unit, '')
  );

-- =====================================================================
-- ALIASES + CROSS-REFERENCES
-- =====================================================================

-- ---------------------------------------------------------------------
-- 10. engine_aliases
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engine_aliases (
  id          bigserial PRIMARY KEY,
  engine_code text NOT NULL,
  alias       text NOT NULL,
  alias_norm  text NOT NULL,
  source_id   bigint NULL REFERENCES public.data_sources(id),
  confidence  numeric(3,2) NOT NULL DEFAULT 1.00,
  notes       text NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT engine_aliases_confidence_chk
    CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_engine_aliases_engine_code ON public.engine_aliases (engine_code);
CREATE INDEX IF NOT EXISTS idx_engine_aliases_alias_norm  ON public.engine_aliases (alias_norm);

CREATE UNIQUE INDEX IF NOT EXISTS uq_engine_aliases_natural
  ON public.engine_aliases (engine_code, alias_norm);

-- ---------------------------------------------------------------------
-- 11. vehicle_model_aliases
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_model_aliases (
  id               bigserial PRIMARY KEY,
  vehicle_model_id bigint NOT NULL REFERENCES public.vehicle_models(id),
  alias            text NOT NULL,
  alias_norm       text NOT NULL,
  source_id        bigint NULL REFERENCES public.data_sources(id),
  confidence       numeric(3,2) NOT NULL DEFAULT 1.00,
  notes            text NULL,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_model_aliases_confidence_chk
    CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_model_aliases_model_id   ON public.vehicle_model_aliases (vehicle_model_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_model_aliases_alias_norm ON public.vehicle_model_aliases (alias_norm);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_model_aliases_natural
  ON public.vehicle_model_aliases (vehicle_model_id, alias_norm);

-- ---------------------------------------------------------------------
-- 12. part_number_crosses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.part_number_crosses (
  id               bigserial PRIMARY KEY,
  from_brand_name  text NULL,
  from_number      text NOT NULL,
  from_number_norm text NOT NULL,
  to_brand_name    text NULL,
  to_number        text NOT NULL,
  to_number_norm   text NOT NULL,
  category_code    text NULL REFERENCES public.part_categories(code),
  engine_code      text NULL,
  relation_type    text NOT NULL,
  source_id        bigint NULL REFERENCES public.data_sources(id),
  confidence       numeric(3,2) NOT NULL DEFAULT 1.00,
  notes            text NULL,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT part_number_crosses_relation_chk CHECK (relation_type IN (
    'oem_to_aftermarket',
    'aftermarket_to_oem',
    'analog',
    'same_as',
    'replacement',
    'supplier_alias',
    'old_to_new'
  )),
  CONSTRAINT part_number_crosses_confidence_chk
    CHECK (confidence >= 0 AND confidence <= 1)
);

DROP TRIGGER IF EXISTS trg_part_number_crosses_touch ON public.part_number_crosses;
CREATE TRIGGER trg_part_number_crosses_touch
  BEFORE UPDATE ON public.part_number_crosses
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_pnc_from_norm      ON public.part_number_crosses (from_number_norm);
CREATE INDEX IF NOT EXISTS idx_pnc_to_norm        ON public.part_number_crosses (to_number_norm);
CREATE INDEX IF NOT EXISTS idx_pnc_engine_code    ON public.part_number_crosses (engine_code);
CREATE INDEX IF NOT EXISTS idx_pnc_category_code  ON public.part_number_crosses (category_code);
CREATE INDEX IF NOT EXISTS idx_pnc_relation_type  ON public.part_number_crosses (relation_type);

CREATE UNIQUE INDEX IF NOT EXISTS uq_part_number_crosses_natural
  ON public.part_number_crosses (
    from_number_norm,
    to_number_norm,
    COALESCE(category_code, ''),
    COALESCE(engine_code,   ''),
    relation_type
  );

-- ---------------------------------------------------------------------
-- Grants — intentionally OMITTED in Stage A.
--
-- New master-database tables are NOT exposed to anon / authenticated.
-- A dedicated RLS / security stage will decide which roles get which
-- privileges (and add RLS policies before re-opening access).
-- Until then the tables are reachable only via the database owner
-- (and whatever default-privilege roles Supabase grants at table
-- creation time — review with `\dp public.<table>` before relying on
-- any external access).
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- Record migration
-- ---------------------------------------------------------------------
INSERT INTO public._migrations_applied (filename)
VALUES ('20260526_stage_a_master_db_foundation.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
