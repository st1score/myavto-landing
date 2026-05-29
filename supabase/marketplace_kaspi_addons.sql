-- =====================================================================
-- Marketplace · Kaspi compatibility add-ons (run AFTER marketplace_clean.sql)
--
-- What this adds:
--   1. products.manufacturer_part_number — артикул производителя (TEIKIN
--      имеет один, NPR другой; разный для каждого бренда). Kaspi требует.
--   2. products.kaspi_type — значение Каспи enum «Тип» (Поршень / Кольца / …).
--   3. products.youtube_id — для Каспи поля «Ссылка на YouTube».
--   4. products.kaspi_image_code — внутренний код изображения Каспи.
--   5. products.weight_kg — вес для расчёта логистики (Каспи).
--   6. products.additional_info — поле «Дополнительная информация» Каспи.
--   7. products.kaspi_vehicles JSONB — список { brand, model, year_from, year_to }
--      для генерации многозначных полей Replacement parts.* car brand/model/year.
--
-- Plus a view v_kaspi_export that emits exactly the columns Kaspi expects.
-- =====================================================================

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS manufacturer_part_number text,
  ADD COLUMN IF NOT EXISTS kaspi_type               text,
  ADD COLUMN IF NOT EXISTS youtube_id               text,
  ADD COLUMN IF NOT EXISTS kaspi_image_code         text,
  ADD COLUMN IF NOT EXISTS weight_kg                numeric(8,3),
  ADD COLUMN IF NOT EXISTS additional_info          text,
  ADD COLUMN IF NOT EXISTS kaspi_vehicles           jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_products_mfr_pn ON public.products(manufacturer_part_number);

-- Brand-specific manufacturer part numbers come from products.manufacturer_part_number
-- BUT в реальности один master_sku может иметь разные mfr part numbers по бренду —
-- это уже моделируется так: разные бренды = разные карточки products. Для удобства
-- ввода добавим helper view brand_part_numbers (group oem+mfr by brand).
CREATE OR REPLACE VIEW public.v_brand_part_numbers AS
SELECT
  p.id                          AS product_id,
  p.brand_code,
  p.manufacturer_part_number,
  p.oem_numbers,
  p.cross_numbers,
  p.compatible_engines
FROM public.products p
WHERE p.status = 'active';

-- =====================================================================
-- Kaspi export view
--
-- One row per (variant × KASPI listing). Columns aligned with Kaspi's
-- xlsx template (en code names). Semicolons join multi-value fields.
-- =====================================================================
CREATE OR REPLACE VIEW public.v_kaspi_export AS
SELECT
  COALESCE(l.external_id, pv.sku) AS merchant_sku,
  COALESCE(l.title_override, p.title) AS name,
  p.brand_code AS brand,
  p.kaspi_image_code AS image_code,
  p.youtube_id AS youtube_id,
  (
    SELECT string_agg(m.url, ';' ORDER BY pm.sort_order)
      FROM public.product_media pm
      JOIN public.media m ON m.id = pm.media_id
     WHERE pm.product_id = p.id
  ) AS image_urls,
  COALESCE(l.description_override, p.description) AS description,
  COALESCE(pv.weight_g::numeric / 1000.0, p.weight_kg) AS weight_kg,
  array_to_string(p.oem_numbers, ';')               AS oem_part_number,
  p.manufacturer_part_number                        AS manufacturer_part_number,
  p.kaspi_type                                      AS type,
  (SELECT string_agg(DISTINCT (v->>'brand'),  ';') FROM jsonb_array_elements(p.kaspi_vehicles) v) AS car_brand,
  (SELECT string_agg(DISTINCT (v->>'model'),  ';') FROM jsonb_array_elements(p.kaspi_vehicles) v) AS car_model,
  (SELECT string_agg(DISTINCT (v->>'year_from'), ';') FROM jsonb_array_elements(p.kaspi_vehicles) v) AS car_year_from,
  (SELECT string_agg(DISTINCT (v->>'year_to'),   ';') FROM jsonb_array_elements(p.kaspi_vehicles) v) AS car_year_to,
  p.additional_info                                 AS additional_information,
  l.price                                           AS price,
  COALESCE((SELECT SUM(s.qty)::int FROM public.stock s WHERE s.variant_id = pv.id), 0) AS stock_qty,
  l.is_active                                       AS is_active,
  p.id           AS internal_product_id,
  pv.id          AS internal_variant_id,
  l.id           AS internal_listing_id
FROM public.products p
JOIN public.product_variants pv ON pv.product_id = p.id
JOIN public.listings l          ON l.variant_id = pv.id AND l.channel_code = 'KASPI'
WHERE p.status = 'active' AND pv.is_active AND l.is_active;

COMMIT;
