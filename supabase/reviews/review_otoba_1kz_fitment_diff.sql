-- =====================================================================
-- C2 REVIEW: diff Otoba.ru staging rows vs master engine_fitments (1KZ)
--
-- SAFETY: this file is READ-ONLY.
--   * No INSERT / UPDATE / DELETE / DROP / TRUNCATE / ALTER / GRANT.
--   * No master-table mutation. Run as many times as you want.
--   * No promotion happens here. Promotion is a separate, future step
--     gated by catalog_import_decisions.
--
-- WHAT IT DOES
--   Compares the 7 staging rows in batch
--   '1kz_otoba_fitment_manual_test' against current
--   public.engine_fitments + public.vehicle_models for engine_code='1KZ'
--   and emits THREE result sets:
--
--   1) MATCHED_BY_MODEL_CHASSIS  — present in both Otoba and master.
--   2) OTOBA_ONLY                — in Otoba staging, missing from master.
--   3) MASTER_ONLY               — in master, missing from Otoba.
--
--   Plus a final SUMMARY with counts.
--
-- MATCHING RULES
--   * engine_code  : '1KZ' on both sides.
--   * make_code    : 'toyota'.
--   * model_name   : case-insensitive, trimmed compare
--                    (vehicle_models.model_name ↔ staging.vehicle_model).
--   * generation   : coalesce-to-'' compare.
--   * chassis_code : coalesce-to-'' compare.
--
-- HOW TO RUN
--   Paste into Supabase SQL Editor. Read all four result sets.
--   Decide on each row (approve / merge / keep-as-needs-verification),
--   then prepare a promotion SQL — NOT part of this file.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Shared CTEs (re-declared inside each SELECT to keep result sets
-- independent and copy-paste-safe in the SQL editor).
-- ---------------------------------------------------------------------

-- ============================================================
-- 1) MATCHED_BY_MODEL_CHASSIS
-- ============================================================
WITH staging AS (
  SELECT
    r.id                                              AS staging_row_id,
    r.row_number,
    r.vehicle_model                                   AS otoba_model,
    r.normalized_json->>'generation'                  AS otoba_generation,
    r.normalized_json->>'chassis_code'                AS otoba_chassis,
    (r.normalized_json->>'year_from')::int            AS otoba_year_from,
    (r.normalized_json->>'year_to')::int              AS otoba_year_to,
    r.normalized_json->>'entity_key'                  AS otoba_entity_key,
    r.confidence                                      AS otoba_confidence
  FROM public.catalog_import_rows r
  JOIN public.catalog_import_batches b ON b.id = r.batch_id
  WHERE b.batch_code  = '1kz_otoba_fitment_manual_test'
    AND r.engine_code = '1KZ'
    AND r.detected_entity_type = 'engine_fitment'
),
master AS (
  SELECT
    ef.id              AS fitment_id,
    ef.engine_code,
    ef.confidence      AS master_confidence,
    ef.notes           AS master_notes,
    ef.source_id       AS master_source_id,
    vm.id              AS vehicle_model_id,
    vm.make_code,
    vm.model_name      AS master_model_name,
    vm.generation      AS master_generation,
    vm.chassis_code    AS master_chassis,
    vm.year_from       AS master_year_from,
    vm.year_to         AS master_year_to
  FROM public.engine_fitments ef
  JOIN public.vehicle_models  vm ON vm.id = ef.vehicle_model_id
  WHERE ef.engine_code = '1KZ'
    AND vm.make_code   = 'toyota'
)
SELECT
  'MATCHED_BY_MODEL_CHASSIS'                          AS bucket,
  s.row_number                                        AS otoba_row_number,
  s.otoba_model,
  s.otoba_generation,
  s.otoba_chassis,
  s.otoba_year_from,
  s.otoba_year_to,
  s.otoba_entity_key,
  s.otoba_confidence,
  m.fitment_id                                        AS master_fitment_id,
  m.vehicle_model_id                                  AS master_vehicle_model_id,
  m.master_model_name,
  m.master_generation,
  m.master_chassis,
  m.master_year_from,
  m.master_year_to,
  m.master_confidence,
  m.master_notes,
  'update confidence to 0.90; update notes to ''verified from otoba.ru''; insert data_source_links(otoba_ru, ' || s.otoba_entity_key || ')'
    AS recommendation
FROM staging s
JOIN master m
  ON lower(trim(m.master_model_name)) = lower(trim(s.otoba_model))
 AND coalesce(m.master_generation, '') = coalesce(s.otoba_generation, '')
 AND coalesce(m.master_chassis,    '') = coalesce(s.otoba_chassis,    '')
ORDER BY s.row_number;

-- ============================================================
-- 2) OTOBA_ONLY  (in staging, not yet in master)
-- ============================================================
WITH staging AS (
  SELECT
    r.id                                              AS staging_row_id,
    r.row_number,
    r.vehicle_model                                   AS otoba_model,
    r.normalized_json->>'generation'                  AS otoba_generation,
    r.normalized_json->>'chassis_code'                AS otoba_chassis,
    (r.normalized_json->>'year_from')::int            AS otoba_year_from,
    (r.normalized_json->>'year_to')::int              AS otoba_year_to,
    r.normalized_json->>'entity_key'                  AS otoba_entity_key,
    r.confidence                                      AS otoba_confidence
  FROM public.catalog_import_rows r
  JOIN public.catalog_import_batches b ON b.id = r.batch_id
  WHERE b.batch_code  = '1kz_otoba_fitment_manual_test'
    AND r.engine_code = '1KZ'
    AND r.detected_entity_type = 'engine_fitment'
),
master AS (
  SELECT
    vm.id              AS vehicle_model_id,
    vm.model_name      AS master_model_name,
    vm.generation      AS master_generation,
    vm.chassis_code    AS master_chassis
  FROM public.engine_fitments ef
  JOIN public.vehicle_models  vm ON vm.id = ef.vehicle_model_id
  WHERE ef.engine_code = '1KZ'
    AND vm.make_code   = 'toyota'
),
master_model_exists AS (
  -- vehicle_models that exist for Toyota even if no 1KZ fitment yet
  SELECT
    vm.id              AS vehicle_model_id,
    vm.model_name,
    vm.generation,
    vm.chassis_code
  FROM public.vehicle_models vm
  WHERE vm.make_code = 'toyota'
)
SELECT
  'OTOBA_ONLY'                                        AS bucket,
  s.row_number                                        AS otoba_row_number,
  s.otoba_model,
  s.otoba_generation,
  s.otoba_chassis,
  s.otoba_year_from,
  s.otoba_year_to,
  s.otoba_entity_key,
  s.otoba_confidence,
  mm.vehicle_model_id                                 AS existing_vehicle_model_id,
  mm.model_name                                       AS existing_model_name,
  mm.generation                                       AS existing_generation,
  mm.chassis_code                                     AS existing_chassis,
  CASE
    WHEN mm.vehicle_model_id IS NULL THEN
      'create vehicle_model (make=toyota, model=' || s.otoba_model ||
      ', gen=' || coalesce(s.otoba_generation,'NULL') ||
      ', chassis=' || coalesce(s.otoba_chassis,'NULL') ||
      '); create engine_fitment(1KZ → new model) confidence 0.90 source otoba_ru'
    ELSE
      'vehicle_model already exists (id=' || mm.vehicle_model_id ||
      ') but no engine_fitment yet — create engine_fitment(1KZ → id ' ||
      mm.vehicle_model_id || ') confidence 0.90 source otoba_ru'
  END                                                 AS recommendation
FROM staging s
LEFT JOIN master m
  ON lower(trim(m.master_model_name)) = lower(trim(s.otoba_model))
 AND coalesce(m.master_generation, '') = coalesce(s.otoba_generation, '')
 AND coalesce(m.master_chassis,    '') = coalesce(s.otoba_chassis,    '')
LEFT JOIN master_model_exists mm
  ON lower(trim(mm.model_name)) = lower(trim(s.otoba_model))
 AND coalesce(mm.generation, '') = coalesce(s.otoba_generation, '')
 AND coalesce(mm.chassis_code, '') = coalesce(s.otoba_chassis, '')
WHERE m.vehicle_model_id IS NULL
ORDER BY s.row_number;

-- ============================================================
-- 3) MASTER_ONLY  (in master, not seen on Otoba)
-- ============================================================
WITH staging AS (
  SELECT
    r.vehicle_model                                   AS otoba_model,
    r.normalized_json->>'generation'                  AS otoba_generation,
    r.normalized_json->>'chassis_code'                AS otoba_chassis
  FROM public.catalog_import_rows r
  JOIN public.catalog_import_batches b ON b.id = r.batch_id
  WHERE b.batch_code  = '1kz_otoba_fitment_manual_test'
    AND r.engine_code = '1KZ'
    AND r.detected_entity_type = 'engine_fitment'
),
master AS (
  SELECT
    ef.id              AS fitment_id,
    ef.confidence      AS master_confidence,
    ef.notes           AS master_notes,
    vm.id              AS vehicle_model_id,
    vm.model_name      AS master_model_name,
    vm.generation      AS master_generation,
    vm.chassis_code    AS master_chassis,
    vm.year_from       AS master_year_from,
    vm.year_to         AS master_year_to
  FROM public.engine_fitments ef
  JOIN public.vehicle_models  vm ON vm.id = ef.vehicle_model_id
  WHERE ef.engine_code = '1KZ'
    AND vm.make_code   = 'toyota'
)
SELECT
  'MASTER_ONLY'                                       AS bucket,
  m.fitment_id                                        AS master_fitment_id,
  m.vehicle_model_id                                  AS master_vehicle_model_id,
  m.master_model_name,
  m.master_generation,
  m.master_chassis,
  m.master_year_from,
  m.master_year_to,
  m.master_confidence,
  m.master_notes,
  'keep as ''needs verification''; do not delete; search another source (TEIKIN catalog / dealer EPC); confidence remains 0.70'
    AS recommendation
FROM master m
LEFT JOIN staging s
  ON lower(trim(m.master_model_name)) = lower(trim(s.otoba_model))
 AND coalesce(m.master_generation, '') = coalesce(s.otoba_generation, '')
 AND coalesce(m.master_chassis,    '') = coalesce(s.otoba_chassis,    '')
WHERE s.otoba_model IS NULL
ORDER BY m.master_model_name, m.master_generation NULLS LAST;

-- ============================================================
-- 4) SUMMARY counts
-- ============================================================
WITH staging AS (
  SELECT
    r.vehicle_model                                   AS otoba_model,
    r.normalized_json->>'generation'                  AS otoba_generation,
    r.normalized_json->>'chassis_code'                AS otoba_chassis
  FROM public.catalog_import_rows r
  JOIN public.catalog_import_batches b ON b.id = r.batch_id
  WHERE b.batch_code  = '1kz_otoba_fitment_manual_test'
    AND r.engine_code = '1KZ'
    AND r.detected_entity_type = 'engine_fitment'
),
master AS (
  SELECT
    vm.id              AS vehicle_model_id,
    vm.model_name      AS master_model_name,
    vm.generation      AS master_generation,
    vm.chassis_code    AS master_chassis
  FROM public.engine_fitments ef
  JOIN public.vehicle_models  vm ON vm.id = ef.vehicle_model_id
  WHERE ef.engine_code = '1KZ'
    AND vm.make_code   = 'toyota'
),
joined AS (
  SELECT
    s.otoba_model,
    s.otoba_generation,
    s.otoba_chassis,
    m.vehicle_model_id
  FROM staging s
  FULL OUTER JOIN master m
    ON lower(trim(m.master_model_name)) = lower(trim(s.otoba_model))
   AND coalesce(m.master_generation, '') = coalesce(s.otoba_generation, '')
   AND coalesce(m.master_chassis,    '') = coalesce(s.otoba_chassis,    '')
)
SELECT
  (SELECT COUNT(*) FROM joined
    WHERE otoba_model IS NOT NULL AND vehicle_model_id IS NOT NULL)  AS matched_count,
  (SELECT COUNT(*) FROM joined
    WHERE otoba_model IS NOT NULL AND vehicle_model_id IS NULL)      AS otoba_only_count,
  (SELECT COUNT(*) FROM joined
    WHERE otoba_model IS NULL     AND vehicle_model_id IS NOT NULL)  AS master_only_count,
  -- Sanity:
  (SELECT COUNT(*) FROM public.engine_fitments WHERE engine_code = '1KZ') AS engine_fitments_1kz_total,
  (SELECT COUNT(*) FROM public.catalog_import_rows r
     JOIN public.catalog_import_batches b ON b.id = r.batch_id
    WHERE b.batch_code = '1kz_otoba_fitment_manual_test')                AS staging_rows_total;
