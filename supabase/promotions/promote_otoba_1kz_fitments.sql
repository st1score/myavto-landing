-- =====================================================================
-- C2 PROMOTION: Otoba.ru → master (1KZ fitments)
--
-- Promotes the 7 reviewed staging rows in batch
-- '1kz_otoba_fitment_manual_test' to master:
--   * UPDATE the 2 MATCHED engine_fitments  (Prado 90, Prado 120)
--   * INSERT 5 new vehicle_models           (4Runner ×3, Hilux 6, HiAce 4)
--   * INSERT 5 new engine_fitments
--   * INSERT data_source_links for all 7 (source = otoba_ru)
--
-- Expected outcome:
--   engine_fitments for 1KZ:  8  →  13
--   master_only fitments stay untouched
--
-- WHAT THIS DOES NOT DO
--   * No DELETE / DROP / TRUNCATE / ALTER / GRANT.
--   * Does not touch engines, products, part_variant_sizes,
--     stock_items, brands, part_categories, or any unrelated row.
--   * Does not touch master_only fitments (Granvia, Regius,
--     Land Cruiser, Dyna/Toyoace, Hiace-NULL, Hilux-Surf-NULL).
--   * Only reads staging rows with status IN ('normalized','approved').
--
-- HOW TO RUN
--   1. Run supabase/reviews/review_otoba_1kz_fitment_diff.sql first.
--   2. Confirm matched_count = 2, otoba_only_count = 5, master_only = 6.
--   3. Open this file, paste into Supabase SQL Editor.
--   4. Read the final SELECT block.
--   5. If anything looks off, run the rollback file in this folder.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0) SANITY CHECKS — refuse to run on the wrong state.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_batch_id        bigint;
  v_otoba_source_id bigint;
  v_staging_count   int;
  v_fitments_before int;
BEGIN
  SELECT id INTO v_batch_id
  FROM public.catalog_import_batches
  WHERE batch_code = '1kz_otoba_fitment_manual_test';
  IF v_batch_id IS NULL THEN
    RAISE EXCEPTION 'Batch "1kz_otoba_fitment_manual_test" missing — apply Stage C1 + import first.';
  END IF;

  SELECT id INTO v_otoba_source_id
  FROM public.data_sources WHERE code = 'otoba_ru';
  IF v_otoba_source_id IS NULL THEN
    RAISE EXCEPTION 'data_source "otoba_ru" missing — apply Stage A seed first.';
  END IF;

  SELECT COUNT(*) INTO v_staging_count
  FROM public.catalog_import_rows
  WHERE batch_id = v_batch_id
    AND engine_code = '1KZ'
    AND detected_entity_type = 'engine_fitment'
    AND status IN ('normalized','approved');
  IF v_staging_count <> 7 THEN
    RAISE EXCEPTION
      'Expected 7 staging rows (status normalized|approved), found %. Refusing to promote.', v_staging_count;
  END IF;

  SELECT COUNT(*) INTO v_fitments_before
  FROM public.engine_fitments WHERE engine_code = '1KZ';
  IF v_fitments_before <> 8 THEN
    RAISE EXCEPTION
      'Expected engine_fitments(1KZ) = 8 before promotion, found %. Refusing.', v_fitments_before;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1) Build a per-row work-set in a TEMP table.
--    Holds: staging fields + resolved vehicle_model_id (if any) +
--           existing engine_fitment_id (if any).
--    ON COMMIT DROP — cleaned up automatically.
-- ---------------------------------------------------------------------
CREATE TEMP TABLE tmp_promo_rows ON COMMIT DROP AS
SELECT
  r.id                                              AS staging_row_id,
  r.row_number,
  r.source_url,
  r.raw_text,
  r.raw_json,
  r.normalized_json,
  r.vehicle_model                                   AS otoba_model,
  r.normalized_json->>'generation'                  AS otoba_generation,
  r.normalized_json->>'chassis_code'                AS otoba_chassis,
  (r.normalized_json->>'year_from')::int            AS otoba_year_from,
  NULLIF(r.normalized_json->>'year_to', '')::int    AS otoba_year_to,
  r.normalized_json->>'entity_key'                  AS otoba_entity_key,
  NULL::bigint                                      AS vehicle_model_id,
  NULL::bigint                                      AS existing_fitment_id
FROM public.catalog_import_rows r
JOIN public.catalog_import_batches b ON b.id = r.batch_id
WHERE b.batch_code  = '1kz_otoba_fitment_manual_test'
  AND r.engine_code = '1KZ'
  AND r.detected_entity_type = 'engine_fitment'
  AND r.status IN ('normalized','approved');

-- ---------------------------------------------------------------------
-- 2) Insert missing vehicle_models for OTOBA_ONLY rows.
--    Existing Toyota models (Prado 90/120, Hiace, …) are skipped by
--    the natural-key unique index uq_vehicle_models_natural.
--    year_from / year_to from staging populate the model row.
-- ---------------------------------------------------------------------
INSERT INTO public.vehicle_models
  (make_code, model_name, generation, chassis_code, year_from, year_to, notes)
SELECT
  'toyota',
  p.otoba_model,
  p.otoba_generation,
  p.otoba_chassis,
  p.otoba_year_from,
  p.otoba_year_to,
  'verified from otoba.ru'
FROM tmp_promo_rows p
ON CONFLICT DO NOTHING;  -- uq_vehicle_models_natural

-- ---------------------------------------------------------------------
-- 3) Resolve vehicle_model_id for every staging row (now that any
--    missing models have just been inserted).
-- ---------------------------------------------------------------------
UPDATE tmp_promo_rows p
SET vehicle_model_id = vm.id
FROM public.vehicle_models vm
WHERE vm.make_code = 'toyota'
  AND lower(trim(vm.model_name))      = lower(trim(p.otoba_model))
  AND coalesce(vm.generation, '')     = coalesce(p.otoba_generation, '')
  AND coalesce(vm.chassis_code, '')   = coalesce(p.otoba_chassis,    '');

-- ---------------------------------------------------------------------
-- 4) Resolve existing engine_fitment for each (1KZ, vehicle_model_id).
--    The existing Stage A fitment may have year_from/year_to = NULL,
--    so we identify it by (engine_code, vehicle_model_id), ignoring
--    the year window — there is only one fitment per pair today.
-- ---------------------------------------------------------------------
UPDATE tmp_promo_rows p
SET existing_fitment_id = ef.id
FROM public.engine_fitments ef
WHERE ef.engine_code      = '1KZ'
  AND ef.vehicle_model_id = p.vehicle_model_id;

-- ---------------------------------------------------------------------
-- 5) MATCHED: update existing engine_fitments in place.
--    Year window now comes from Otoba. confidence → 0.90. notes / source.
-- ---------------------------------------------------------------------
UPDATE public.engine_fitments ef
SET year_from  = p.otoba_year_from,
    year_to    = p.otoba_year_to,
    confidence = 0.90,
    notes      = 'verified from otoba.ru',
    source_id  = (SELECT id FROM public.data_sources WHERE code = 'otoba_ru'),
    is_active  = true
FROM tmp_promo_rows p
WHERE ef.id = p.existing_fitment_id
  AND p.existing_fitment_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 6) OTOBA_ONLY: insert new engine_fitments.
--    Idempotent via uq_engine_fitments_natural.
-- ---------------------------------------------------------------------
INSERT INTO public.engine_fitments
  (engine_code, vehicle_model_id, year_from, year_to,
   source_id, confidence, notes, is_active)
SELECT
  '1KZ',
  p.vehicle_model_id,
  p.otoba_year_from,
  p.otoba_year_to,
  (SELECT id FROM public.data_sources WHERE code = 'otoba_ru'),
  0.90,
  'verified from otoba.ru',
  true
FROM tmp_promo_rows p
WHERE p.existing_fitment_id IS NULL
  AND p.vehicle_model_id IS NOT NULL
ON CONFLICT DO NOTHING;  -- uq_engine_fitments_natural

-- ---------------------------------------------------------------------
-- 7) data_source_links for every promoted row.
--    Conflict target mirrors uq_data_source_links_dedup from Stage A.
-- ---------------------------------------------------------------------
INSERT INTO public.data_source_links
  (source_id, source_run_id, entity_type, entity_key,
   source_page, source_url, raw_text, raw_json, confidence)
SELECT
  (SELECT id FROM public.data_sources WHERE code = 'otoba_ru'),
  NULL,
  'engine_fitment',
  p.otoba_entity_key,
  NULL,
  p.source_url,
  p.raw_text,
  p.raw_json,
  0.90
FROM tmp_promo_rows p
ON CONFLICT
  (source_id, COALESCE(source_run_id, 0), entity_type, entity_key,
   COALESCE(source_page, ''), COALESCE(source_url, ''))
DO UPDATE
SET raw_text   = EXCLUDED.raw_text,
    raw_json   = EXCLUDED.raw_json,
    confidence = EXCLUDED.confidence,
    source_url = EXCLUDED.source_url;

COMMIT;

-- =====================================================================
-- Verification (read-only). Run after the COMMIT above.
-- =====================================================================

-- 1) engine_fitments count for 1KZ — expected 13
SELECT COUNT(*) AS engine_fitments_1kz_after
FROM public.engine_fitments
WHERE engine_code = '1KZ';

-- 2) All engine_fitments for 1KZ after promotion
SELECT
  ef.id,
  vm.model_name,
  vm.generation,
  vm.chassis_code,
  ef.year_from,
  ef.year_to,
  ef.confidence,
  ds.code AS source_code,
  ef.notes
FROM public.engine_fitments ef
JOIN public.vehicle_models  vm ON vm.id = ef.vehicle_model_id
LEFT JOIN public.data_sources ds ON ds.id = ef.source_id
WHERE ef.engine_code = '1KZ'
ORDER BY ds.code NULLS LAST, vm.model_name, vm.generation NULLS LAST;

-- 3) data_source_links for Otoba 1KZ entities
SELECT
  l.id,
  ds.code AS source_code,
  l.entity_type,
  l.entity_key,
  l.source_url,
  l.confidence
FROM public.data_source_links l
JOIN public.data_sources ds ON ds.id = l.source_id
WHERE ds.code = 'otoba_ru'
  AND l.entity_key LIKE '1KZ:%'
ORDER BY l.entity_key;

-- 4) master_only rows that still need verification (untouched by promotion)
SELECT
  ef.id              AS fitment_id,
  vm.model_name,
  vm.generation,
  vm.chassis_code,
  ef.confidence,
  ef.notes
FROM public.engine_fitments ef
JOIN public.vehicle_models  vm ON vm.id = ef.vehicle_model_id
LEFT JOIN public.data_sources ds ON ds.id = ef.source_id
WHERE ef.engine_code = '1KZ'
  AND (ds.code IS DISTINCT FROM 'otoba_ru')
ORDER BY vm.model_name;
