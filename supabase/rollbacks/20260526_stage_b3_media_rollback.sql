-- =====================================================================
-- ROLLBACK for Stage B3: media layer
--
-- Drops only B3 artifacts. Does NOT touch:
--   * Stage A tables
--   * Stage B1 tables (products, sales_channels) or B1 functions
--   * Existing tables (engines, brands, part_*, stock_items, …)
--   * The shared trigger function tg_touch_updated_at (Stage A)
--
-- WARNING: destroys all rows in media_assets, engine_media,
-- product_media. Take a backup first.
-- =====================================================================

BEGIN;

-- FK-safe drop order: link tables first, asset table last.
DROP TABLE IF EXISTS public.product_media  CASCADE;
DROP TABLE IF EXISTS public.engine_media   CASCADE;
DROP TABLE IF EXISTS public.media_assets   CASCADE;

DELETE FROM public._migrations_applied
WHERE filename = '20260526_stage_b3_media.sql';

COMMIT;
