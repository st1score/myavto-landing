-- =====================================================================
-- Stage C1 seed: import sources + test batch + sample staging rows
--
-- 1) Ensures otoba_ru data_source exists (seeded in Stage A; re-asserted
--    here so the seed is self-contained if someone runs it standalone).
-- 2) Creates ONE test batch for 1KZ Otoba fitment verification.
-- 3) Adds 3 sample staging rows for 1KZ models (Land Cruiser Prado 120,
--    Hilux Surf, Hiace) — all at status='needs_review'.
--
-- IMPORTANT: this seed does NOT write to engine_fitments or any other
-- master table. Staging rows must go through review → approve →
-- import_to_master before they affect production data.
--
-- Idempotent: ON CONFLICT DO NOTHING against unique indexes.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) data_sources: ensure otoba_ru is present and up to date
-- ---------------------------------------------------------------------
INSERT INTO public.data_sources
  (code,       name,                                 source_type, url,                 language, notes)
VALUES
  ('otoba_ru', 'Otoba.ru vehicle fitment source',    'website',   'https://otoba.ru',  'ru',     'Source for engine-to-vehicle fitment verification')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2) catalog_import_batches: test batch for 1KZ Otoba fitment
-- ---------------------------------------------------------------------
INSERT INTO public.catalog_import_batches
  (source_id,
   batch_code,
   import_type,
   status,
   source_url,
   parser_name,
   parser_version,
   notes,
   meta_json)
SELECT
  (SELECT id FROM public.data_sources WHERE code = 'otoba_ru'),
  '1kz_otoba_fitment_manual_test',
  'otoba_fitment',
  'draft',
  'https://otoba.ru',
  'manual',
  'v0',
  'Stage C1 test batch for Toyota 1KZ fitment verification',
  jsonb_build_object(
    'engine_code', '1KZ',
    'purpose',     'verify Stage A 1KZ fitments against otoba.ru',
    'created_in',  'seed_c1_import_sources.sql'
  )
ON CONFLICT (batch_code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3) catalog_import_rows: 3 sample rows for 1KZ
--
-- These are STAGING rows. They do not affect engine_fitments. Their
-- normalized_json mirrors what the eventual otoba.ru parser would emit
-- so the downstream review/approval flow can be tested end-to-end.
-- ---------------------------------------------------------------------

-- 3.1 Land Cruiser Prado 120 / J120
INSERT INTO public.catalog_import_rows
  (batch_id, row_number, source_page, source_url,
   raw_text,
   raw_json,
   normalized_json,
   detected_entity_type,
   engine_code, vehicle_make, vehicle_model,
   confidence, status, error_text)
SELECT
  b.id, 1,
  'otoba.ru/cars/toyota/land-cruiser-prado/120/',
  'https://otoba.ru/cars/toyota/land-cruiser-prado/120/',
  'Toyota Land Cruiser Prado 120 (J120) — engine 1KZ-TE',
  jsonb_build_object(
    'engine_text',  '1KZ-TE',
    'model_text',   'Land Cruiser Prado',
    'generation',   '120',
    'chassis_code', 'J120'
  ),
  jsonb_build_object(
    'engine_code',     '1KZ',
    'vehicle_make',    'toyota',
    'vehicle_model',   'Land Cruiser Prado',
    'generation',      '120',
    'chassis_code',    'J120',
    'entity_key',      '1KZ:toyota:land-cruiser-prado:120',
    'needs_verification', true
  ),
  'engine_fitment',
  '1KZ', 'toyota', 'Land Cruiser Prado',
  0.70, 'needs_review', NULL
FROM public.catalog_import_batches b
WHERE b.batch_code = '1kz_otoba_fitment_manual_test'
ON CONFLICT DO NOTHING; -- catches uq_catalog_import_rows_batch_row

-- 3.2 Hilux Surf
INSERT INTO public.catalog_import_rows
  (batch_id, row_number, source_page, source_url,
   raw_text,
   raw_json,
   normalized_json,
   detected_entity_type,
   engine_code, vehicle_make, vehicle_model,
   confidence, status, error_text)
SELECT
  b.id, 2,
  'otoba.ru/cars/toyota/hilux-surf/',
  'https://otoba.ru/cars/toyota/hilux-surf/',
  'Toyota Hilux Surf — engine 1KZ-TE',
  jsonb_build_object('engine_text', '1KZ-TE', 'model_text', 'Hilux Surf'),
  jsonb_build_object(
    'engine_code',        '1KZ',
    'vehicle_make',       'toyota',
    'vehicle_model',      'Hilux Surf',
    'entity_key',         '1KZ:toyota:hilux-surf',
    'needs_verification', true
  ),
  'engine_fitment',
  '1KZ', 'toyota', 'Hilux Surf',
  0.70, 'needs_review', NULL
FROM public.catalog_import_batches b
WHERE b.batch_code = '1kz_otoba_fitment_manual_test'
ON CONFLICT DO NOTHING;

-- 3.3 Hiace
INSERT INTO public.catalog_import_rows
  (batch_id, row_number, source_page, source_url,
   raw_text,
   raw_json,
   normalized_json,
   detected_entity_type,
   engine_code, vehicle_make, vehicle_model,
   confidence, status, error_text)
SELECT
  b.id, 3,
  'otoba.ru/cars/toyota/hiace/',
  'https://otoba.ru/cars/toyota/hiace/',
  'Toyota Hiace — engine 1KZ-TE',
  jsonb_build_object('engine_text', '1KZ-TE', 'model_text', 'Hiace'),
  jsonb_build_object(
    'engine_code',        '1KZ',
    'vehicle_make',       'toyota',
    'vehicle_model',      'Hiace',
    'entity_key',         '1KZ:toyota:hiace',
    'needs_verification', true
  ),
  'engine_fitment',
  '1KZ', 'toyota', 'Hiace',
  0.70, 'needs_review', NULL
FROM public.catalog_import_batches b
WHERE b.batch_code = '1kz_otoba_fitment_manual_test'
ON CONFLICT DO NOTHING;

COMMIT;
