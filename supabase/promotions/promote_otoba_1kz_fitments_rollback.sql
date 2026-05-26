-- =====================================================================
-- ROLLBACK for promote_otoba_1kz_fitments.sql
--
-- Reverts the Otoba promotion of 1KZ fitments:
--
--   * Deletes the 5 engine_fitments inserted for OTOBA_ONLY models
--     (4Runner 2/3/4 (N120/N180/N210), Hilux 6 (N140), HiAce 4 (H100))
--     — only those whose source_id = otoba_ru and notes match the
--     promotion marker.
--
--   * Deletes the 5 vehicle_models created by promotion, BUT only if
--     no other engine_fitment still references them.
--
--   * Reverts the 2 MATCHED fitments (Prado 90 / Prado 120) back to
--     Stage A baseline:
--         confidence = 0.70
--         notes      = 'needs verification until otoba.ru parsed'
--         source_id  = manual_myavto
--         year_from  = NULL
--         year_to    = NULL
--     Only when source_id = otoba_ru AND notes = 'verified from otoba.ru'
--     (so a manually edited row is left alone).
--
--   * Deletes data_source_links where source = otoba_ru and
--     entity_key LIKE '1KZ:%'.
--
-- WHAT THIS DOES NOT DO
--   * Does not touch Stage A seed rows beyond reverting the two
--     MATCHED fitments.
--   * Does not delete any vehicle_models that still have any
--     engine_fitment referencing them.
--   * Does not touch master_only fitments (Granvia, Regius, etc.).
--   * Does not touch engines, products, part_*, stock_items.
--   * Does not touch the staging batch / rows / decisions.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Delete data_source_links from Otoba for 1KZ entities.
-- ---------------------------------------------------------------------
DELETE FROM public.data_source_links l
USING public.data_sources ds
WHERE l.source_id = ds.id
  AND ds.code = 'otoba_ru'
  AND l.entity_key LIKE '1KZ:%';

-- ---------------------------------------------------------------------
-- 2) Capture the vehicle_model_ids that promotion likely created.
--    We use these later to decide if a vehicle_model can be deleted.
-- ---------------------------------------------------------------------
CREATE TEMP TABLE tmp_rollback_target_models ON COMMIT DROP AS
SELECT id
FROM public.vehicle_models
WHERE make_code = 'toyota'
  AND (
       (model_name = '4Runner' AND generation = '2' AND chassis_code = 'N120')
    OR (model_name = '4Runner' AND generation = '3' AND chassis_code = 'N180')
    OR (model_name = '4Runner' AND generation = '4' AND chassis_code = 'N210')
    OR (model_name = 'Hilux'   AND generation = '6' AND chassis_code = 'N140')
    OR (model_name = 'HiAce'   AND generation = '4' AND chassis_code = 'H100')
  );

-- ---------------------------------------------------------------------
-- 3) Delete the 5 new engine_fitments inserted by promotion.
--    Filter by source_id=otoba_ru AND notes='verified from otoba.ru'
--    AND vehicle_model_id in the target set, so a manually-edited
--    row never gets deleted by accident.
-- ---------------------------------------------------------------------
DELETE FROM public.engine_fitments ef
USING public.data_sources ds, tmp_rollback_target_models t
WHERE ef.engine_code      = '1KZ'
  AND ef.source_id        = ds.id
  AND ds.code             = 'otoba_ru'
  AND ef.notes            = 'verified from otoba.ru'
  AND ef.vehicle_model_id = t.id;

-- ---------------------------------------------------------------------
-- 4) Delete the 5 created vehicle_models, but only if no other
--    engine_fitment still references them.
-- ---------------------------------------------------------------------
DELETE FROM public.vehicle_models vm
USING tmp_rollback_target_models t
WHERE vm.id = t.id
  AND NOT EXISTS (
    SELECT 1 FROM public.engine_fitments ef
    WHERE ef.vehicle_model_id = vm.id
  );

-- ---------------------------------------------------------------------
-- 5) Revert the 2 MATCHED fitments (Prado 90, Prado 120) to Stage A
--    baseline — only if they still carry the promotion marker.
-- ---------------------------------------------------------------------
UPDATE public.engine_fitments ef
SET confidence = 0.70,
    notes      = 'needs verification until otoba.ru parsed',
    source_id  = (SELECT id FROM public.data_sources WHERE code = 'manual_myavto'),
    year_from  = NULL,
    year_to    = NULL
FROM public.vehicle_models vm,
     public.data_sources ds_old
WHERE ef.vehicle_model_id = vm.id
  AND ef.engine_code      = '1KZ'
  AND vm.make_code        = 'toyota'
  AND vm.model_name       = 'Land Cruiser Prado'
  AND vm.generation       IN ('90','120')
  AND ef.source_id        = ds_old.id
  AND ds_old.code         = 'otoba_ru'
  AND ef.notes            = 'verified from otoba.ru';

COMMIT;

-- =====================================================================
-- Verification (read-only). Run after the COMMIT above.
-- Expected:
--   engine_fitments(1KZ)            = 8
--   Prado 90 / 120 confidence       = 0.70
--   Prado 90 / 120 notes            = 'needs verification until otoba.ru parsed'
--   data_source_links from otoba_ru for 1KZ = 0
-- =====================================================================

SELECT COUNT(*) AS engine_fitments_1kz_after_rollback
FROM public.engine_fitments WHERE engine_code = '1KZ';

SELECT
  vm.model_name, vm.generation, vm.chassis_code,
  ef.year_from, ef.year_to, ef.confidence, ef.notes,
  ds.code AS source_code
FROM public.engine_fitments ef
JOIN public.vehicle_models  vm ON vm.id = ef.vehicle_model_id
LEFT JOIN public.data_sources ds ON ds.id = ef.source_id
WHERE ef.engine_code = '1KZ'
ORDER BY vm.model_name, vm.generation NULLS LAST;

SELECT COUNT(*) AS otoba_links_remaining
FROM public.data_source_links l
JOIN public.data_sources ds ON ds.id = l.source_id
WHERE ds.code = 'otoba_ru'
  AND l.entity_key LIKE '1KZ:%';
