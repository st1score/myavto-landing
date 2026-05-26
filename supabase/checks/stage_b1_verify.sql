-- =====================================================================
-- Stage B1 verification queries (read-only).
-- Run after migration + seed.
-- =====================================================================

-- 1) sales_channels seed (expect 8 rows)
SELECT code, name, kind, currency_default, locale_default, is_active
FROM public.sales_channels
ORDER BY code;

-- 2) products count by (engine_code, category_code)
SELECT engine_code, category_code, COUNT(*) AS products_count
FROM public.products
GROUP BY engine_code, category_code
ORDER BY products_count DESC, engine_code;

-- 3) 1KZ piston products with generated SKU
SELECT id, sku, engine_code, category_code, part_name, brand_name,
       variant_name, insert_type, size_code, confidence, is_active
FROM public.products
WHERE engine_code = '1KZ'
  AND category_code = 'PISTON'
ORDER BY brand_name, variant_name, insert_type, size_code;

-- 4) Duplicate SKU check — must return 0 rows
SELECT sku, COUNT(*) AS dup_count
FROM public.products
GROUP BY sku
HAVING COUNT(*) > 1;

-- 5) Duplicate natural-key check — must return 0 rows
SELECT engine_code, category_code, part_name, brand_name,
       variant_name, size_code, insert_type, COUNT(*) AS dup_count
FROM public.products
GROUP BY 1,2,3,4,5,6,7
HAVING COUNT(*) > 1;

-- 6) Confirm existing tables still present (untouched)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('part_variant_sizes','stock_items')
ORDER BY table_name;

-- 7) Confirm no NULL/empty SKU
SELECT id, engine_code, brand_name, variant_name, size_code, sku
FROM public.products
WHERE sku IS NULL OR btrim(sku) = '';

-- 8) Bonus: SKU samples from the trigger generator
SELECT
  public.generate_product_sku('1KZ','PISTON','TEIKIN','46283','AG','0.50') AS sample_ag_050,
  public.generate_product_sku('1KZ','PISTON','TEIKIN','46283','plain','STD') AS sample_plain_std,
  public.generate_product_sku('1KZ','PISTON','ND','ND','plain','STD')        AS sample_nd_std,
  public.generate_product_sku('B6 16V','PISTON','TEIKIN','12345','A','0.25') AS sample_b6_a_025;

-- 9) Cross-check products vs part_variant_sizes for 1KZ PISTON
-- Expect: products_count == pvs_count (all backfilled).
SELECT
  (SELECT COUNT(*) FROM public.products
   WHERE engine_code='1KZ' AND category_code='PISTON' AND is_active) AS products_count,
  (SELECT COUNT(*) FROM public.part_variant_sizes
   WHERE engine_code='1KZ' AND category_code='PISTON' AND is_active) AS pvs_count;
