-- =====================================================================
-- Stage B3 verification queries (read-only).
-- Run after migration + seed.
-- =====================================================================

-- 1) media_assets — total count + breakdown by media_type
SELECT media_type, COUNT(*) AS cnt
FROM public.media_assets
GROUP BY media_type
ORDER BY cnt DESC;

-- 1b) Total media_assets
SELECT COUNT(*) AS media_assets_total FROM public.media_assets;

-- 2) engine_media for 1KZ
SELECT em.engine_code, em.role, em.sort_order,
       ma.id AS media_id, ma.url, ma.media_type, ma.alt_text
FROM public.engine_media em
JOIN public.media_assets ma ON ma.id = em.media_id
WHERE em.engine_code = '1KZ'
ORDER BY em.role, em.sort_order;

-- 3) product_media count for 1KZ TEIKIN
SELECT COUNT(*) AS product_media_1kz_teikin
FROM public.product_media pm
JOIN public.products p ON p.id = pm.product_id
WHERE p.engine_code   = '1KZ'
  AND p.category_code = 'PISTON'
  AND p.brand_name    = 'TEIKIN';

-- 4) 1KZ TEIKIN products with their primary image
SELECT
  p.id, p.sku, p.variant_name, p.insert_type, p.size_code,
  ma.url AS primary_image_url
FROM public.products p
LEFT JOIN public.product_media pm
  ON pm.product_id = p.id AND pm.role = 'primary'
LEFT JOIN public.media_assets ma
  ON ma.id = pm.media_id
WHERE p.engine_code   = '1KZ'
  AND p.category_code = 'PISTON'
  AND p.brand_name    = 'TEIKIN'
ORDER BY p.variant_name, p.insert_type, p.size_code;

-- 5) Duplicate primary image per product — must return 0 rows
SELECT product_id, COUNT(*) AS primary_count
FROM public.product_media
WHERE role = 'primary'
GROUP BY product_id
HAVING COUNT(*) > 1;

-- 6) Duplicate catalog image per engine — must return 0 rows
SELECT engine_code, COUNT(*) AS catalog_count
FROM public.engine_media
WHERE role = 'catalog'
GROUP BY engine_code
HAVING COUNT(*) > 1;

-- 7) Confirm pre-existing / earlier-stage tables still present
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('products','part_variant_sizes','stock_items','engines')
ORDER BY table_name;
