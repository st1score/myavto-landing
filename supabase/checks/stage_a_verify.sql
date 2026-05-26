-- =====================================================================
-- Stage A verification queries
-- Read-only. Run after migration + seed.
-- =====================================================================

-- 1) All new Stage A tables present in public schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'vehicle_makes',
    'vehicle_models',
    'engine_fitments',
    'vehicle_specs',
    'data_sources',
    'data_source_runs',
    'data_source_links',
    'audit_log',
    'engine_aliases',
    'vehicle_model_aliases',
    'part_number_crosses'
  )
ORDER BY table_name;

-- 2) All seeded data_sources
SELECT id, code, source_type, brand_name, language, is_active
FROM public.data_sources
ORDER BY id;

-- 3) All fitments for 1KZ
SELECT
  ef.id           AS fitment_id,
  ef.engine_code,
  vm.make_code,
  vm.model_name,
  vm.generation,
  vm.chassis_code,
  ef.year_from,
  ef.year_to,
  ef.confidence,
  ds.code         AS source_code,
  ef.notes
FROM public.engine_fitments ef
JOIN public.vehicle_models  vm ON vm.id = ef.vehicle_model_id
LEFT JOIN public.data_sources ds ON ds.id = ef.source_id
WHERE ef.engine_code = '1KZ'
  AND ef.is_active = true
ORDER BY vm.model_name, vm.generation NULLS LAST;

-- 4) vehicle_specs for Toyota models
SELECT
  vm.model_name,
  vm.generation,
  vs.spec_code,
  vs.value_text,
  vs.value_number,
  vs.unit,
  vs.confidence,
  ds.code AS source_code
FROM public.vehicle_specs vs
JOIN public.vehicle_models  vm ON vm.id = vs.vehicle_model_id
LEFT JOIN public.data_sources ds ON ds.id = vs.source_id
WHERE vm.make_code = 'toyota'
ORDER BY vm.model_name, vs.spec_code;

-- 5) Duplicate check: vehicle_models — must return 0 rows
SELECT
  make_code,
  model_name,
  COALESCE(generation,'')   AS gen,
  COALESCE(chassis_code,'') AS chassis,
  COALESCE(body_code,'')    AS body,
  COALESCE(region,'')       AS region,
  COUNT(*) AS dup_count
FROM public.vehicle_models
GROUP BY 1,2,3,4,5,6
HAVING COUNT(*) > 1;

-- 6) Duplicate check: engine_fitments — must return 0 rows
SELECT
  engine_code,
  vehicle_model_id,
  COALESCE(year_from,-1) AS yf,
  COALESCE(year_to,-1)   AS yt,
  COALESCE(region,'')    AS region,
  COUNT(*) AS dup_count
FROM public.engine_fitments
GROUP BY 1,2,3,4,5
HAVING COUNT(*) > 1;

-- 7) engine_aliases for 1KZ
SELECT id, engine_code, alias, alias_norm, confidence, notes
FROM public.engine_aliases
WHERE engine_code = '1KZ'
ORDER BY alias_norm;

-- 8) vehicle_model_aliases for Prado 120
SELECT
  vma.id,
  vm.model_name,
  vm.generation,
  vma.alias,
  vma.alias_norm,
  vma.confidence,
  vma.notes
FROM public.vehicle_model_aliases vma
JOIN public.vehicle_models vm ON vm.id = vma.vehicle_model_id
WHERE vm.make_code  = 'toyota'
  AND vm.model_name = 'Land Cruiser Prado'
  AND vm.generation = '120'
ORDER BY vma.alias_norm;

-- 9) data_source_links for 1KZ-related entities
SELECT
  l.id,
  ds.code AS source_code,
  l.entity_type,
  l.entity_key,
  l.source_url,
  l.confidence,
  l.raw_text
FROM public.data_source_links l
JOIN public.data_sources ds ON ds.id = l.source_id
WHERE l.entity_key ILIKE '%1KZ%'
   OR l.entity_key ILIKE '%land-cruiser-prado:120%'
ORDER BY l.id;

-- 10) Confirm existing core tables still exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('engines','engine_part_numbers','stock_items')
ORDER BY table_name;

-- 11) Confirm engines contains a row matching 1KZ
SELECT brand_name, engine_code, engine_name, is_diesel, volume_l
FROM public.engines
WHERE engine_code ILIKE '%1KZ%'
ORDER BY brand_name, engine_code;
