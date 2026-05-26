-- =====================================================================
-- Stage B1 seed: sales_channels + 1KZ products backfill
--
-- 1) Seeds sales_channels (8 rows).
-- 2) Backfills products from part_variant_sizes for engine_code='1KZ',
--    category_code='PISTON', is_active=true.
--
-- SKU is generated automatically by the BEFORE INSERT trigger on
-- products (sku passed as NULL).
--
-- Idempotent: ON CONFLICT against unique sku / natural key DO NOTHING.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) sales_channels
-- ---------------------------------------------------------------------
INSERT INTO public.sales_channels (code, name, kind, notes)
VALUES
  ('website',    'Website',    'site',        'Public site my-avto.kz'),
  ('kaspi',      'Kaspi',      'marketplace', 'Kaspi.kz marketplace'),
  ('telegram',   'Telegram bot','bot',        'Telegram support / order bot'),
  ('google_ads', 'Google Ads', 'ads',         'Google Ads / Merchant Center'),
  ('n8n',        'n8n',        'automation',  'n8n automated imports / syncs'),
  ('retail',     'Retail',     'price_type',  'Retail price (sale-to-customer)'),
  ('wholesale',  'Wholesale',  'price_type',  'Wholesale / B2B price'),
  ('promo',      'Promo',      'price_type',  'Promo / discount price')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2) products backfill for 1KZ PISTON
--
-- INSERT ... SELECT from part_variant_sizes. sku is NULL → trigger
-- tg_products_fill_sku() generates it before insert. On conflict with
-- uq_products_natural we skip the row.
-- ---------------------------------------------------------------------
INSERT INTO public.products (
  sku,                -- NULL → trigger fills
  engine_code,
  category_code,
  part_name,
  brand_name,
  variant_name,
  insert_type,
  size_code,
  source_id,
  confidence,
  notes,
  is_active
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
  'backfilled from part_variant_sizes for 1KZ PISTON',
  true
FROM public.part_variant_sizes pvs
WHERE pvs.engine_code   = '1KZ'
  AND pvs.category_code = 'PISTON'
  AND pvs.is_active     = true
ON CONFLICT DO NOTHING; -- catches uq_products_natural and unique sku

COMMIT;
