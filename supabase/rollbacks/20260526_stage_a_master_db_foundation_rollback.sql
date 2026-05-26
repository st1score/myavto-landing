-- =====================================================================
-- ROLLBACK for Stage A: Master DB foundation
--
-- DROPS only the tables introduced by Stage A, in FK-safe order.
-- DOES NOT touch any pre-existing table (engines, brands, part_*,
-- stock_items, warehouses, etc.).
--
-- The shared function public.tg_touch_updated_at() is NOT dropped — it
-- may be reused by future stages. Uncomment the line at the bottom if
-- you really want to remove it.
--
-- WARNING: this destroys all rows in the new tables, including any
-- imports done after the migration was applied. Take a backup first.
-- =====================================================================

BEGIN;

-- Drop in reverse FK order (children → parents).
-- CASCADE is intentional to clean up any FKs we may add in later stages
-- (e.g. existing tables getting a source_id FK to data_sources).

DROP TABLE IF EXISTS public.part_number_crosses     CASCADE;
DROP TABLE IF EXISTS public.vehicle_model_aliases   CASCADE;
DROP TABLE IF EXISTS public.engine_aliases          CASCADE;

DROP TABLE IF EXISTS public.vehicle_specs           CASCADE;
DROP TABLE IF EXISTS public.engine_fitments         CASCADE;
DROP TABLE IF EXISTS public.vehicle_models          CASCADE;
DROP TABLE IF EXISTS public.vehicle_makes           CASCADE;

DROP TABLE IF EXISTS public.audit_log               CASCADE;
DROP TABLE IF EXISTS public.data_source_links       CASCADE;
DROP TABLE IF EXISTS public.data_source_runs        CASCADE;
DROP TABLE IF EXISTS public.data_sources            CASCADE;

DELETE FROM public._migrations_applied
WHERE filename = '20260526_stage_a_master_db_foundation.sql';

-- Optional: remove shared trigger function (only if no other stage uses it)
-- DROP FUNCTION IF EXISTS public.tg_touch_updated_at();

COMMIT;
