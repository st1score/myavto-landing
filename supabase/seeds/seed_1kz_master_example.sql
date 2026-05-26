-- =====================================================================
-- Stage A seed: 1KZ master example
--
-- Seeds:
--   * 11 data_sources (catalogs + otoba.ru + manual + AI + n8n)
--   * Toyota make
--   * 8 Toyota models (Prado 90/120, Hiace, Hilux Surf, Granvia, Regius,
--     Land Cruiser, Dyna/Toyoace) — years/bodies NULL until otoba.ru parsed
--   * engine_fitments for 1KZ → all 8 models (confidence 0.70)
--   * engine_aliases for 1KZ: 1KZ, 1KZ-TE, 1KZTE, 1 KZ
--   * vehicle_model_aliases for Prado 120: Prado 120, Land Cruiser Prado 120, J120, KZJ120
--   * data_source_links for engine_fitment + vehicle_model examples
--
-- Idempotent: ON CONFLICT DO NOTHING against natural unique indexes.
-- Years are NOT invented; left NULL with notes='needs verification'.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) data_sources
-- ---------------------------------------------------------------------
INSERT INTO public.data_sources
  (code,                  name,                                                                     source_type,         brand_name, url,                  language, notes)
VALUES
  ('existing_database',   'Existing MY AVTO database (pre-Stage A)',                                'existing_database', NULL,       NULL,                 'ru',     'Baseline: rows present before provenance was introduced'),
  ('manual_myavto',       'Manual entry by MY AVTO team',                                           'manual',            NULL,       NULL,                 'ru',     'Owner-curated rows'),
  ('otoba_ru',            'otoba.ru vehicle specifications and fitment source',                     'website',           NULL,       'https://otoba.ru',   'ru',     'vehicle years, body codes, generations, technical vehicle specs, engine fitment'),
  ('teikin_catalog',      'TEIKIN engine parts catalog',                                            'pdf_catalog',       'TEIKIN',   NULL,                 'en',     'TEIKIN piston/ring/liner books'),
  ('npr_catalog',         'NPR rings catalog',                                                      'pdf_catalog',       'NPR',      NULL,                 'en',     NULL),
  ('kp_catalog',          'KP / Korea Pistons catalog',                                             'pdf_catalog',       'KP',       NULL,                 'en',     NULL),
  ('taiho_catalog',       'Taiho bearings catalog',                                                 'pdf_catalog',       'TAIHO',    NULL,                 'en',     NULL),
  ('acl_catalog',         'ACL bearings catalog',                                                   'pdf_catalog',       'ACL',      NULL,                 'en',     NULL),
  ('supabase_sql_editor', 'Supabase SQL editor (ad-hoc)',                                           'manual',            NULL,       NULL,                 NULL,     'For one-off manual fixes'),
  ('n8n_import',          'n8n workflows',                                                          'n8n',               NULL,       NULL,                 NULL,     'Automated imports / syncs'),
  ('ai_generated',        'AI-generated (LLM proposals)',                                           'ai_generated',      NULL,       NULL,                 NULL,     'Default for LLM-produced rows; expect confidence < 1.0')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2) vehicle_makes
-- ---------------------------------------------------------------------
INSERT INTO public.vehicle_makes (code, name, country)
VALUES ('toyota', 'Toyota', 'Japan')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3) vehicle_models — years NULL, notes='needs verification' on all
-- ---------------------------------------------------------------------
INSERT INTO public.vehicle_models
  (make_code, model_name,            generation, chassis_code, notes)
VALUES
  ('toyota',  'Land Cruiser Prado',  '90',       'J90',        'needs verification'),
  ('toyota',  'Land Cruiser Prado',  '120',      'J120',       'needs verification'),
  ('toyota',  'Hiace',               NULL,        NULL,        'needs verification'),
  ('toyota',  'Hilux Surf',          NULL,        NULL,        'needs verification'),
  ('toyota',  'Granvia',             NULL,        NULL,        'needs verification'),
  ('toyota',  'Regius',              NULL,        NULL,        'needs verification'),
  ('toyota',  'Land Cruiser',        NULL,        NULL,        'needs verification'),
  ('toyota',  'Dyna / Toyoace',      NULL,        NULL,        'needs verification')
ON CONFLICT DO NOTHING; -- catches uq_vehicle_models_natural

-- ---------------------------------------------------------------------
-- 4) engine_fitments — 1KZ → all 8 Toyota models
--    confidence 0.70, source = manual_myavto
-- ---------------------------------------------------------------------
INSERT INTO public.engine_fitments
  (engine_code, vehicle_model_id, confidence, source_id, notes)
SELECT
  '1KZ',
  vm.id,
  0.70,
  (SELECT id FROM public.data_sources WHERE code = 'manual_myavto'),
  'needs verification until otoba.ru parsed'
FROM public.vehicle_models vm
WHERE vm.make_code = 'toyota'
  AND (
       (vm.model_name = 'Land Cruiser Prado' AND vm.generation = '90')
    OR (vm.model_name = 'Land Cruiser Prado' AND vm.generation = '120')
    OR  vm.model_name IN ('Hiace','Hilux Surf','Granvia','Regius',
                          'Land Cruiser','Dyna / Toyoace')
  )
ON CONFLICT DO NOTHING; -- catches uq_engine_fitments_natural

-- ---------------------------------------------------------------------
-- 5) engine_aliases for 1KZ
--    alias_norm = uppercase, only [A-Z0-9]
-- ---------------------------------------------------------------------
INSERT INTO public.engine_aliases (engine_code, alias, alias_norm, source_id, confidence, notes)
VALUES
  ('1KZ', '1KZ',    '1KZ',   (SELECT id FROM public.data_sources WHERE code='manual_myavto'), 1.00, NULL),
  ('1KZ', '1KZ-TE', '1KZTE', (SELECT id FROM public.data_sources WHERE code='manual_myavto'), 1.00, 'TEIKIN catalog form'),
  ('1KZ', '1KZTE',  '1KZTE', (SELECT id FROM public.data_sources WHERE code='manual_myavto'), 1.00, 'no-dash form'),
  ('1KZ', '1 KZ',   '1KZ',   (SELECT id FROM public.data_sources WHERE code='manual_myavto'), 0.90, 'space-separated form (user input)')
ON CONFLICT DO NOTHING; -- catches uq_engine_aliases_natural

-- ---------------------------------------------------------------------
-- 6) vehicle_model_aliases for Prado 120
-- ---------------------------------------------------------------------
INSERT INTO public.vehicle_model_aliases (vehicle_model_id, alias, alias_norm, source_id, confidence, notes)
SELECT vm.id, a.alias, a.alias_norm,
       (SELECT id FROM public.data_sources WHERE code='manual_myavto'),
       a.confidence, a.notes
FROM public.vehicle_models vm
CROSS JOIN (VALUES
  ('Prado 120',              'PRADO120',            1.00, 'short form'),
  ('Land Cruiser Prado 120', 'LANDCRUISERPRADO120', 1.00, 'full form'),
  ('J120',                   'J120',                1.00, 'chassis code'),
  ('KZJ120',                 'KZJ120',              1.00, 'chassis with engine prefix')
) AS a(alias, alias_norm, confidence, notes)
WHERE vm.make_code  = 'toyota'
  AND vm.model_name = 'Land Cruiser Prado'
  AND vm.generation = '120'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 7) data_source_links — provenance examples
-- ---------------------------------------------------------------------

-- 7.1 engine_fitment link (1KZ → Prado 120) — manual seed
INSERT INTO public.data_source_links
  (source_id, entity_type, entity_key, raw_text, confidence)
SELECT
  (SELECT id FROM public.data_sources WHERE code = 'manual_myavto'),
  'engine_fitment',
  '1KZ:toyota:land-cruiser-prado:120',
  'manual seed example, needs verification until otoba.ru parsed',
  0.70
WHERE EXISTS (SELECT 1 FROM public.data_sources WHERE code = 'manual_myavto')
ON CONFLICT DO NOTHING;

-- 7.2 vehicle_model link (Prado 120) — otoba.ru placeholder
INSERT INTO public.data_source_links
  (source_id, entity_type, entity_key, source_url, raw_text, confidence)
SELECT
  (SELECT id FROM public.data_sources WHERE code = 'otoba_ru'),
  'vehicle_model',
  'toyota:land-cruiser-prado:120',
  'https://otoba.ru',
  'placeholder link; needs parser verification',
  0.70
WHERE EXISTS (SELECT 1 FROM public.data_sources WHERE code = 'otoba_ru')
ON CONFLICT DO NOTHING;

COMMIT;
