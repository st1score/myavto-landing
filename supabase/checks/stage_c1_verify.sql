-- =====================================================================
-- Stage C1 verification queries (read-only).
-- Run after migration + seed.
-- =====================================================================

-- 1) New C1 tables present in public schema (expect 4 rows)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'catalog_import_batches',
    'catalog_import_rows',
    'catalog_import_decisions',
    'catalog_import_mappings'
  )
ORDER BY table_name;

-- 2) otoba_ru data_source
SELECT id, code, name, source_type, url, language, is_active
FROM public.data_sources
WHERE code = 'otoba_ru';

-- 3) Import batch for 1KZ
SELECT
  b.id, b.batch_code, b.import_type, b.status, b.source_url,
  b.parser_name, b.parser_version,
  b.rows_total, b.rows_parsed, b.rows_normalized,
  b.rows_approved, b.rows_imported, b.rows_failed,
  b.notes, b.meta_json
FROM public.catalog_import_batches b
JOIN public.data_sources ds ON ds.id = b.source_id
WHERE ds.code = 'otoba_ru'
  AND b.batch_code = '1kz_otoba_fitment_manual_test';

-- 4) Import rows for 1KZ (expect 3)
SELECT
  r.id, r.row_number, r.engine_code, r.vehicle_make, r.vehicle_model,
  r.detected_entity_type, r.confidence, r.status,
  r.normalized_json->>'entity_key' AS canonical_entity_key,
  r.source_url
FROM public.catalog_import_rows r
JOIN public.catalog_import_batches b ON b.id = r.batch_id
WHERE b.batch_code = '1kz_otoba_fitment_manual_test'
ORDER BY r.row_number;

-- 5) Row status breakdown for this batch
SELECT r.status, COUNT(*) AS rows_count
FROM public.catalog_import_rows r
JOIN public.catalog_import_batches b ON b.id = r.batch_id
WHERE b.batch_code = '1kz_otoba_fitment_manual_test'
GROUP BY r.status
ORDER BY rows_count DESC;

-- 6) Confirm engine_fitments was NOT touched by staging.
-- Stage A applied 8 fitments for 1KZ; staging must not have added any.
SELECT
  COUNT(*)                               AS engine_fitments_1kz_total,
  COUNT(*) FILTER (WHERE confidence = 0.70) AS engine_fitments_1kz_0_70,
  MIN(created_at)                        AS earliest_created,
  MAX(created_at)                        AS latest_created
FROM public.engine_fitments
WHERE engine_code = '1KZ';

-- 7) Confirm prior-stage tables still exist (untouched)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'engines',
    'part_variant_sizes',
    'stock_items',
    'engine_fitments',
    'vehicle_models',
    'data_sources',
    'data_source_runs',
    'data_source_links',
    'products',
    'sales_channels',
    'media_assets',
    'engine_media',
    'product_media'
  )
ORDER BY table_name;

-- 8) Confirm no orphan decisions exist (decisions without a row)
SELECT d.id, d.import_row_id, d.decision
FROM public.catalog_import_decisions d
LEFT JOIN public.catalog_import_rows r ON r.id = d.import_row_id
WHERE r.id IS NULL;

-- 9) Confirm no orphan rows (rows without a batch) — should be 0
SELECT r.id
FROM public.catalog_import_rows r
LEFT JOIN public.catalog_import_batches b ON b.id = r.batch_id
WHERE b.id IS NULL;
