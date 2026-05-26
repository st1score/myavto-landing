-- =====================================================================
-- Stage B3 seed: 1KZ TEIKIN catalog image
--
-- 1) Inserts media_assets row for the existing TEIKIN catalog PNG.
-- 2) Links it to engine_code='1KZ' as role='catalog'.
-- 3) Links it to every product where engine_code='1KZ',
--    category_code='PISTON', brand_name='TEIKIN' as role='primary'.
--
-- Idempotent: ON CONFLICT DO NOTHING against the unique indexes.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) media_assets — TEIKIN 1KZ catalog image
-- ---------------------------------------------------------------------
INSERT INTO public.media_assets
  (url, storage_path, media_type, mime_type, alt_text, source_id, confidence, notes, is_active)
VALUES
  ('https://my-avto.kz/teikin-catalog/1KZ.png',
   'teikin-catalog/1KZ.png',
   'image',
   'image/png',
   'TEIKIN catalog image for Toyota 1KZ piston',
   (SELECT id FROM public.data_sources WHERE code = 'teikin_catalog'),
   1.00,
   'Existing TEIKIN catalog image used by site fallback',
   true)
ON CONFLICT (url) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2) engine_media — 1KZ → catalog image
-- ---------------------------------------------------------------------
INSERT INTO public.engine_media (engine_code, media_id, role, sort_order)
SELECT
  '1KZ',
  ma.id,
  'catalog',
  0
FROM public.media_assets ma
WHERE ma.url = 'https://my-avto.kz/teikin-catalog/1KZ.png'
ON CONFLICT DO NOTHING; -- catches PK + uq_engine_media_one_catalog

-- ---------------------------------------------------------------------
-- 3) product_media — all 1KZ PISTON TEIKIN products → primary image
-- ---------------------------------------------------------------------
INSERT INTO public.product_media (product_id, media_id, role, sort_order)
SELECT
  p.id,
  ma.id,
  'primary',
  0
FROM public.products p
CROSS JOIN public.media_assets ma
WHERE p.engine_code   = '1KZ'
  AND p.category_code = 'PISTON'
  AND p.brand_name    = 'TEIKIN'
  AND p.is_active     = true
  AND ma.url          = 'https://my-avto.kz/teikin-catalog/1KZ.png'
ON CONFLICT DO NOTHING; -- catches PK + uq_product_media_one_primary

COMMIT;
