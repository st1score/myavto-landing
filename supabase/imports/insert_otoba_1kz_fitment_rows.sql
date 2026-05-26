-- =====================================================================
-- Insert 7 Otoba.ru parser rows into Stage C1 staging.
--
-- Source:  tmp/otoba_1kz_fitment_rows.json
--          (produced by scripts/import/otoba_1kz_fitment_parser.ts)
-- Target:  public.catalog_import_rows
-- Batch:   batch_code = '1kz_otoba_fitment_manual_test'  (created in
--          Stage C1 seed; reused here, not recreated).
--
-- WHAT THIS SCRIPT DOES
--   * Inserts 7 staging rows (row_number = 1..7).
--   * Idempotent via the existing unique index
--     uq_catalog_import_rows_batch_row (batch_id, row_number).
--     Re-running this file UPSERTs the same 7 rows in place.
--   * Re-running this file will OVERWRITE any pre-existing rows with
--     row_number 1..7 inside that batch (e.g. the 3 demo rows seeded
--     in Stage C1). That is intentional: parser output supersedes
--     demo placeholders for the same batch.
--
-- WHAT THIS SCRIPT DOES NOT DO
--   * Does NOT touch engine_fitments, vehicle_models, vehicle_specs,
--     vehicle_model_aliases, engine_aliases, products, or any other
--     master / Stage A / Stage B table.
--   * Does NOT promote staging rows to master. Promotion is a separate
--     step performed only after human review via
--     catalog_import_decisions.
--   * Does NOT delete, drop, or truncate anything.
--   * Does NOT mutate the batch row beyond what the row UPSERT
--     touches via its FK.
--
-- HOW TO RUN (manually, in Supabase SQL Editor)
--   1. Open this file.
--   2. Paste into the SQL editor.
--   3. Execute. Read the verification block at the bottom.
--   4. If counts look wrong, do NOT proceed to promotion.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Sanity: refuse to run if the target batch does not exist.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_batch_id bigint;
BEGIN
  SELECT id INTO v_batch_id
  FROM public.catalog_import_batches
  WHERE batch_code = '1kz_otoba_fitment_manual_test';

  IF v_batch_id IS NULL THEN
    RAISE EXCEPTION
      'Batch "1kz_otoba_fitment_manual_test" not found. Apply Stage C1 migration + seed first.';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- UPSERT the 7 Otoba rows.
-- Uses a CTE so the batch lookup happens once. All literal data lives
-- in the VALUES list — easy to diff against tmp/otoba_1kz_fitment_rows.json.
-- ---------------------------------------------------------------------
WITH b AS (
  SELECT id AS batch_id
  FROM public.catalog_import_batches
  WHERE batch_code = '1kz_otoba_fitment_manual_test'
),
src(row_number, source_url, raw_text, raw_json, normalized_json,
    detected_entity_type, engine_code, category_code, part_number,
    brand_name, vehicle_make, vehicle_model, confidence, status) AS (
  VALUES
    -- 1) Land Cruiser Prado 90 (J90), 1996 - 2002
    (1::int,
     'https://otoba.ru/dvigatel/toyota/1kz-te.html',
     'Toyota LC Prado 90 (J90) 1996 - 2002',
     '{"model_raw":"LC Prado","generation":"90","chassis_code":"J90","year_from":1996,"year_to":2002,"engine_alias":"1KZ-TE"}'::jsonb,
     '{"engine_code":"1KZ","engine_alias":"1KZ-TE","vehicle_make":"Toyota","vehicle_model":"Land Cruiser Prado","generation":"90","chassis_code":"J90","year_from":1996,"year_to":2002,"entity_key":"1KZ:toyota:land-cruiser-prado:90","needs_verification":false,"source":"otoba_ru"}'::jsonb,
     'engine_fitment',
     '1KZ', NULL::text, NULL::text, NULL::text,
     'Toyota', 'Land Cruiser Prado',
     0.90::numeric(3,2), 'normalized'),

    -- 2) Land Cruiser Prado 120 (J120), 2002 - 2006
    (2,
     'https://otoba.ru/dvigatel/toyota/1kz-te.html',
     'Toyota LC Prado 120 (J120) 2002 - 2006',
     '{"model_raw":"LC Prado","generation":"120","chassis_code":"J120","year_from":2002,"year_to":2006,"engine_alias":"1KZ-TE"}'::jsonb,
     '{"engine_code":"1KZ","engine_alias":"1KZ-TE","vehicle_make":"Toyota","vehicle_model":"Land Cruiser Prado","generation":"120","chassis_code":"J120","year_from":2002,"year_to":2006,"entity_key":"1KZ:toyota:land-cruiser-prado:120","needs_verification":false,"source":"otoba_ru"}'::jsonb,
     'engine_fitment',
     '1KZ', NULL, NULL, NULL,
     'Toyota', 'Land Cruiser Prado',
     0.90, 'normalized'),

    -- 3) 4Runner 2 (N120), 1993 - 1995
    (3,
     'https://otoba.ru/dvigatel/toyota/1kz-te.html',
     'Toyota 4Runner 2 (N120) 1993 - 1995',
     '{"model_raw":"4Runner","generation":"2","chassis_code":"N120","year_from":1993,"year_to":1995,"engine_alias":"1KZ-TE"}'::jsonb,
     '{"engine_code":"1KZ","engine_alias":"1KZ-TE","vehicle_make":"Toyota","vehicle_model":"4Runner","generation":"2","chassis_code":"N120","year_from":1993,"year_to":1995,"entity_key":"1KZ:toyota:4runner:2","needs_verification":false,"source":"otoba_ru"}'::jsonb,
     'engine_fitment',
     '1KZ', NULL, NULL, NULL,
     'Toyota', '4Runner',
     0.90, 'normalized'),

    -- 4) 4Runner 3 (N180), 1995 - 2002
    (4,
     'https://otoba.ru/dvigatel/toyota/1kz-te.html',
     'Toyota 4Runner 3 (N180) 1995 - 2002',
     '{"model_raw":"4Runner","generation":"3","chassis_code":"N180","year_from":1995,"year_to":2002,"engine_alias":"1KZ-TE"}'::jsonb,
     '{"engine_code":"1KZ","engine_alias":"1KZ-TE","vehicle_make":"Toyota","vehicle_model":"4Runner","generation":"3","chassis_code":"N180","year_from":1995,"year_to":2002,"entity_key":"1KZ:toyota:4runner:3","needs_verification":false,"source":"otoba_ru"}'::jsonb,
     'engine_fitment',
     '1KZ', NULL, NULL, NULL,
     'Toyota', '4Runner',
     0.90, 'normalized'),

    -- 5) 4Runner 4 (N210), 2002 - 2006
    (5,
     'https://otoba.ru/dvigatel/toyota/1kz-te.html',
     'Toyota 4Runner 4 (N210) 2002 - 2006',
     '{"model_raw":"4Runner","generation":"4","chassis_code":"N210","year_from":2002,"year_to":2006,"engine_alias":"1KZ-TE"}'::jsonb,
     '{"engine_code":"1KZ","engine_alias":"1KZ-TE","vehicle_make":"Toyota","vehicle_model":"4Runner","generation":"4","chassis_code":"N210","year_from":2002,"year_to":2006,"entity_key":"1KZ:toyota:4runner:4","needs_verification":false,"source":"otoba_ru"}'::jsonb,
     'engine_fitment',
     '1KZ', NULL, NULL, NULL,
     'Toyota', '4Runner',
     0.90, 'normalized'),

    -- 6) Hilux 6 (N140), 1997 - 2002
    (6,
     'https://otoba.ru/dvigatel/toyota/1kz-te.html',
     'Toyota Hilux 6 (N140) 1997 - 2002',
     '{"model_raw":"Hilux","generation":"6","chassis_code":"N140","year_from":1997,"year_to":2002,"engine_alias":"1KZ-TE"}'::jsonb,
     '{"engine_code":"1KZ","engine_alias":"1KZ-TE","vehicle_make":"Toyota","vehicle_model":"Hilux","generation":"6","chassis_code":"N140","year_from":1997,"year_to":2002,"entity_key":"1KZ:toyota:hilux:6","needs_verification":false,"source":"otoba_ru"}'::jsonb,
     'engine_fitment',
     '1KZ', NULL, NULL, NULL,
     'Toyota', 'Hilux',
     0.90, 'normalized'),

    -- 7) HiAce 4 (H100), 1993 - 2004
    (7,
     'https://otoba.ru/dvigatel/toyota/1kz-te.html',
     'Toyota HiAce 4 (H100) 1993 - 2004',
     '{"model_raw":"HiAce","generation":"4","chassis_code":"H100","year_from":1993,"year_to":2004,"engine_alias":"1KZ-TE"}'::jsonb,
     '{"engine_code":"1KZ","engine_alias":"1KZ-TE","vehicle_make":"Toyota","vehicle_model":"HiAce","generation":"4","chassis_code":"H100","year_from":1993,"year_to":2004,"entity_key":"1KZ:toyota:hiace:4","needs_verification":false,"source":"otoba_ru"}'::jsonb,
     'engine_fitment',
     '1KZ', NULL, NULL, NULL,
     'Toyota', 'HiAce',
     0.90, 'normalized')
)
INSERT INTO public.catalog_import_rows (
  batch_id, row_number, source_url, raw_text, raw_json, normalized_json,
  detected_entity_type, engine_code, category_code, part_number,
  brand_name, vehicle_make, vehicle_model, confidence, status
)
SELECT
  b.batch_id, s.row_number, s.source_url, s.raw_text, s.raw_json, s.normalized_json,
  s.detected_entity_type, s.engine_code, s.category_code, s.part_number,
  s.brand_name, s.vehicle_make, s.vehicle_model, s.confidence, s.status
FROM src s
CROSS JOIN b
ON CONFLICT (batch_id, row_number) DO UPDATE
SET
  source_url           = EXCLUDED.source_url,
  raw_text             = EXCLUDED.raw_text,
  raw_json             = EXCLUDED.raw_json,
  normalized_json      = EXCLUDED.normalized_json,
  detected_entity_type = EXCLUDED.detected_entity_type,
  engine_code          = EXCLUDED.engine_code,
  category_code        = EXCLUDED.category_code,
  part_number          = EXCLUDED.part_number,
  brand_name           = EXCLUDED.brand_name,
  vehicle_make         = EXCLUDED.vehicle_make,
  vehicle_model        = EXCLUDED.vehicle_model,
  confidence           = EXCLUDED.confidence,
  status               = EXCLUDED.status,
  error_text           = NULL;

COMMIT;

-- =====================================================================
-- Verification (read-only). Run after the COMMIT above.
-- =====================================================================

-- 1) Count rows in this batch (expect 7 after this insert; could be
--    higher if extra demo rows from the Stage C1 seed were never
--    overwritten — that would mean row_numbers > 7 exist).
SELECT COUNT(*) AS rows_in_batch
FROM public.catalog_import_rows r
JOIN public.catalog_import_batches b ON b.id = r.batch_id
WHERE b.batch_code = '1kz_otoba_fitment_manual_test';

-- 2) The 7 inserted rows, ordered.
SELECT
  r.row_number,
  r.engine_code,
  r.vehicle_make,
  r.vehicle_model,
  r.normalized_json->>'generation'   AS generation,
  r.normalized_json->>'chassis_code' AS chassis_code,
  r.normalized_json->>'year_from'    AS year_from,
  r.normalized_json->>'year_to'      AS year_to,
  r.normalized_json->>'entity_key'   AS entity_key,
  r.confidence,
  r.status
FROM public.catalog_import_rows r
JOIN public.catalog_import_batches b ON b.id = r.batch_id
WHERE b.batch_code = '1kz_otoba_fitment_manual_test'
  AND r.row_number BETWEEN 1 AND 7
ORDER BY r.row_number;

-- 3) Confirm engine_fitments for 1KZ is still 8 (Stage A baseline).
--    Staging must NOT have promoted anything to master.
SELECT COUNT(*) AS engine_fitments_1kz_count
FROM public.engine_fitments
WHERE engine_code = '1KZ';
-- Expected: 8
