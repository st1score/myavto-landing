-- Backfill ALL active part_variant_sizes into products.
-- Same shape as seed_b1_1kz_products.sql but without engine/category filter.
-- Idempotent: ON CONFLICT DO NOTHING on uq_products_natural.

BEGIN;

INSERT INTO public.products (
  sku, engine_code, category_code, part_name, brand_name,
  variant_name, insert_type, size_code, source_id, confidence, notes, is_active
)
SELECT
  NULL,
  pvs.engine_code,
  pvs.category_code,
  pvs.part_name,
  pvs.brand_name,
  pvs.variant_name,
  pvs.insert_type,
  pvs.size_code,
  (SELECT id FROM public.data_sources WHERE code = 'existing_database'),
  1.00,
  'bulk backfill from part_variant_sizes',
  true
FROM public.part_variant_sizes pvs
WHERE pvs.is_active = true
ON CONFLICT DO NOTHING;

-- Refresh search MV so new rows show up.
SELECT public.refresh_search_products();

COMMIT;
