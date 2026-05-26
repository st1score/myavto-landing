-- =====================================================================
-- ROLLBACK for Stage B1: products + sales_channels + SKU functions
--
-- Drops only B1 artifacts. Does NOT touch:
--   * Stage A tables (vehicle_*, engine_fitments, data_sources,
--     data_source_runs, data_source_links, audit_log, engine_aliases,
--     vehicle_model_aliases, part_number_crosses, vehicle_specs)
--   * Existing tables (engines, brands, part_categories, part_*,
--     stock_items, size_codes, warehouses, attributes, …)
--   * The shared trigger function tg_touch_updated_at (Stage A)
--
-- WARNING: this destroys all rows in products and sales_channels,
-- including any imports done after the migration was applied. Take a
-- backup first.
-- =====================================================================

BEGIN;

-- Drop B1 tables (CASCADE in case future stages added FKs to products)
DROP TABLE IF EXISTS public.products        CASCADE;
DROP TABLE IF EXISTS public.sales_channels  CASCADE;

-- Drop B1 trigger functions
DROP FUNCTION IF EXISTS public.tg_products_fill_sku()       CASCADE;
DROP FUNCTION IF EXISTS public.tg_products_immutable_sku()  CASCADE;

-- Drop B1 SKU helper functions
DROP FUNCTION IF EXISTS public.generate_product_sku(text,text,text,text,text,text) CASCADE;
DROP FUNCTION IF EXISTS public.category_code_to_sku(text)   CASCADE;
DROP FUNCTION IF EXISTS public.size_code_to_sku(text)       CASCADE;
DROP FUNCTION IF EXISTS public.normalize_sku_part(text)     CASCADE;

DELETE FROM public._migrations_applied
WHERE filename = '20260526_stage_b1_products.sql';

COMMIT;
