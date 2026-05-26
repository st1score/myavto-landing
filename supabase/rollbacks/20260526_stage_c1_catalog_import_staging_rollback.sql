-- =====================================================================
-- ROLLBACK for Stage C1: catalog import staging layer
--
-- Drops only C1 artifacts. Does NOT touch:
--   * Stage A tables (vehicle_*, engine_fitments, data_sources,
--     data_source_runs, data_source_links, audit_log, engine_aliases,
--     vehicle_model_aliases, part_number_crosses, vehicle_specs)
--   * Stage B1 (products, sales_channels) or B1 functions
--   * Stage B3 (media_assets, engine_media, product_media)
--   * Existing tables (engines, brands, part_*, stock_items, …)
--   * The shared trigger function tg_touch_updated_at (Stage A)
--
-- The otoba_ru row in data_sources is intentionally PRESERVED — it was
-- introduced in Stage A and is referenced by other rows (e.g.
-- data_source_links). Removing it here would corrupt Stage A state.
--
-- WARNING: destroys all rows in C1 tables, including any in-flight
-- imports. Take a backup first.
-- =====================================================================

BEGIN;

-- FK-safe drop order: decisions → rows → batches; mappings is
-- independent. CASCADE in case future stages add FKs.
DROP TABLE IF EXISTS public.catalog_import_decisions  CASCADE;
DROP TABLE IF EXISTS public.catalog_import_rows       CASCADE;
DROP TABLE IF EXISTS public.catalog_import_batches    CASCADE;
DROP TABLE IF EXISTS public.catalog_import_mappings   CASCADE;

DELETE FROM public._migrations_applied
WHERE filename = '20260526_stage_c1_catalog_import_staging.sql';

COMMIT;
