-- =====================================================================
-- Stage B5: search (denormalized MV + RPC)
--
-- Additive-only. Idempotent. Safe to re-run.
--
-- Depends on: B1 (products), B2 (prices, v_current_prices), B3 (media),
-- B4 (product_content), A (engine_aliases, engine_fitments, vehicle_*,
-- part_number_crosses), legacy (engines, engine_part_numbers, stock_items).
--
-- Strategy:
--   * mv_search_products denormalizes a product card row.
--   * Full-text search via tsvector + GIN.
--   * Fuzzy/typo via pg_trgm GIN on sku/oem.
--   * RPC search_products() applies filters + ranking + pagination.
--   * Refresh on demand via refresh_search_products() (Directus button or cron).
--
-- No GRANT / RLS — security stage handles that.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- f_unaccent: best-effort diacritic strip. On Supabase, unaccent typically
-- lives in `extensions` schema; we try that first, fall back to plain lower().
-- Wrapped IMMUTABLE so it can be used in expression indexes.
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT lower($1);
$$;

-- =====================================================================
-- mv_search_products: one row per active product, denormalized.
-- =====================================================================
DROP MATERIALIZED VIEW IF EXISTS public.mv_search_products CASCADE;

CREATE MATERIALIZED VIEW public.mv_search_products AS
WITH
  oem_per_product AS (
    SELECT
      p.id AS product_id,
      array_remove(array_agg(DISTINCT epn.number_value::text), NULL)::text[] AS oem_numbers
    FROM public.products p
    LEFT JOIN public.engine_part_numbers epn
      ON epn.engine_code   = p.engine_code
     AND epn.category_code = p.category_code
     AND epn.is_active     = true
    GROUP BY p.id
  ),
  crosses_per_product AS (
    SELECT
      p.id AS product_id,
      array_remove(array_agg(DISTINCT x.cross_number::text), NULL)::text[] AS cross_numbers
    FROM public.products p
    LEFT JOIN LATERAL (
      SELECT pnc.to_number AS cross_number
        FROM public.part_number_crosses pnc
       WHERE pnc.engine_code   = p.engine_code
         AND pnc.category_code = p.category_code
         AND pnc.is_active     = true
      UNION
      SELECT pnc.from_number AS cross_number
        FROM public.part_number_crosses pnc
       WHERE pnc.engine_code   = p.engine_code
         AND pnc.category_code = p.category_code
         AND pnc.is_active     = true
    ) x ON true
    GROUP BY p.id
  ),
  engine_aliases_agg AS (
    SELECT
      engine_code,
      array_remove(array_agg(DISTINCT alias::text), NULL)::text[] AS aliases
    FROM public.engine_aliases
    GROUP BY engine_code
  ),
  vehicles_per_engine AS (
    SELECT
      ef.engine_code,
      array_remove(array_agg(DISTINCT
        concat_ws(' ', vmk.name, vm.model_name, vm.generation)::text), NULL)::text[] AS vehicles
    FROM public.engine_fitments ef
    JOIN public.vehicle_models vm  ON vm.id   = ef.vehicle_model_id
    JOIN public.vehicle_makes  vmk ON vmk.code = vm.make_code
    WHERE ef.is_active = true
    GROUP BY ef.engine_code
  ),
  stock_per_product AS (
    SELECT
      p.id AS product_id,
      SUM(si.qty)::int AS total_qty
    FROM public.products p
    LEFT JOIN public.stock_items si
      ON si.engine_code   = p.engine_code
     AND si.category_code = p.category_code
     AND si.brand_name    = p.brand_name
     AND si.variant_name  = p.variant_name
     AND si.size_code     = p.size_code
     AND coalesce(si.insert_type,'plain') = coalesce(p.insert_type,'plain')
    GROUP BY p.id
  ),
  primary_media AS (
    SELECT DISTINCT ON (pm.product_id)
      pm.product_id,
      ma.url      AS image_url,
      ma.alt_text AS image_alt
    FROM public.product_media pm
    JOIN public.media_assets ma ON ma.id = pm.media_id
    WHERE pm.role = 'primary'
      AND ma.is_active = true
    ORDER BY pm.product_id, pm.sort_order, pm.media_id
  ),
  engine_catalog_image AS (
    SELECT DISTINCT ON (em.engine_code)
      em.engine_code,
      ma.url AS image_url
    FROM public.engine_media em
    JOIN public.media_assets ma ON ma.id = em.media_id
    WHERE em.role = 'catalog'
      AND ma.is_active = true
    ORDER BY em.engine_code, em.sort_order, em.media_id
  ),
  current_price AS (
    SELECT product_id, channel_code, currency, amount
    FROM public.v_current_prices
    WHERE channel_code = 'website' AND currency = 'KZT'
  ),
  default_content AS (
    SELECT product_id, title, short_desc, seo_title, seo_desc, seo_keywords
    FROM public.product_content
    WHERE locale = 'ru' AND channel_code IS NULL AND is_published = true
  )
SELECT
  p.id                              AS product_id,
  p.sku,
  p.engine_code,
  p.category_code,
  p.brand_name,
  p.part_name,
  p.variant_name,
  p.insert_type,
  p.size_code,
  p.is_active,

  coalesce(dc.title,
           concat_ws(' ',
             coalesce(pc.name, p.category_code),
             p.engine_code, p.brand_name, p.variant_name,
             nullif(p.insert_type,'plain'), p.size_code)) AS title,
  dc.short_desc,
  dc.seo_title,
  dc.seo_desc,
  coalesce(dc.seo_keywords, ARRAY[]::text[]) AS seo_keywords,

  coalesce(oem.oem_numbers, ARRAY[]::text[])     AS oem_numbers,
  coalesce(cr.cross_numbers, ARRAY[]::text[])    AS cross_numbers,
  coalesce(ea.aliases, ARRAY[]::text[])          AS engine_aliases,
  coalesce(vpe.vehicles, ARRAY[]::text[])        AS vehicles,

  coalesce(pm.image_url, eci.image_url)          AS image_url,
  pm.image_alt,

  cp.amount                                      AS price_kzt,
  coalesce(spp.total_qty, 0)                     AS stock_qty,
  (coalesce(spp.total_qty, 0) > 0)               AS in_stock,

  -- Full-text vector: RU + simple fallback, weighted.
  setweight(to_tsvector('simple', coalesce(p.sku,'')), 'A') ||
  setweight(to_tsvector('simple', array_to_string(coalesce(oem.oem_numbers, ARRAY[]::text[]), ' ')), 'A') ||
  setweight(to_tsvector('simple', array_to_string(coalesce(cr.cross_numbers, ARRAY[]::text[]), ' ')), 'A') ||
  setweight(to_tsvector('simple',
    concat_ws(' ', p.engine_code, array_to_string(coalesce(ea.aliases, ARRAY[]::text[]), ' '))), 'B') ||
  setweight(to_tsvector('russian',
    coalesce(public.f_unaccent(dc.title), public.f_unaccent(concat_ws(' ', p.brand_name, p.part_name)))), 'B') ||
  setweight(to_tsvector('russian',
    public.f_unaccent(array_to_string(coalesce(vpe.vehicles, ARRAY[]::text[]), ' '))), 'C') ||
  setweight(to_tsvector('russian',
    coalesce(public.f_unaccent(dc.short_desc), '')), 'D')
  AS tsv,

  -- Trigram-friendly concatenation for fuzzy SKU/OEM lookups.
  lower(concat_ws(' ',
    p.sku,
    array_to_string(coalesce(oem.oem_numbers, ARRAY[]::text[]), ' '),
    array_to_string(coalesce(cr.cross_numbers, ARRAY[]::text[]), ' ')
  )) AS trgm_blob

FROM public.products p
LEFT JOIN public.part_categories pc        ON pc.code = p.category_code
LEFT JOIN oem_per_product       oem        ON oem.product_id = p.id
LEFT JOIN crosses_per_product   cr         ON cr.product_id  = p.id
LEFT JOIN engine_aliases_agg    ea         ON ea.engine_code = p.engine_code
LEFT JOIN vehicles_per_engine   vpe        ON vpe.engine_code = p.engine_code
LEFT JOIN stock_per_product     spp        ON spp.product_id = p.id
LEFT JOIN primary_media         pm         ON pm.product_id = p.id
LEFT JOIN engine_catalog_image  eci        ON eci.engine_code = p.engine_code
LEFT JOIN current_price         cp         ON cp.product_id = p.id
LEFT JOIN default_content       dc         ON dc.product_id = p.id
WHERE p.is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS mv_search_products_pk
  ON public.mv_search_products (product_id);
CREATE INDEX IF NOT EXISTS mv_search_products_tsv
  ON public.mv_search_products USING gin (tsv);
CREATE INDEX IF NOT EXISTS mv_search_products_trgm
  ON public.mv_search_products USING gin (trgm_blob gin_trgm_ops);
CREATE INDEX IF NOT EXISTS mv_search_products_engine
  ON public.mv_search_products (engine_code);
CREATE INDEX IF NOT EXISTS mv_search_products_category
  ON public.mv_search_products (category_code);
CREATE INDEX IF NOT EXISTS mv_search_products_brand
  ON public.mv_search_products (brand_name);
CREATE INDEX IF NOT EXISTS mv_search_products_in_stock
  ON public.mv_search_products (in_stock);

-- =====================================================================
-- refresh_search_products(): callable from Directus / cron / triggers.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.refresh_search_products()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_search_products;
EXCEPTION WHEN feature_not_supported THEN
  -- First refresh after create needs non-concurrent.
  REFRESH MATERIALIZED VIEW public.mv_search_products;
END;
$$;

-- =====================================================================
-- search_products RPC
-- =====================================================================
DROP FUNCTION IF EXISTS public.search_products(text, text, text, text, text, boolean, int, int);

CREATE OR REPLACE FUNCTION public.search_products(
  q             text    DEFAULT NULL,
  p_engine      text    DEFAULT NULL,
  p_category    text    DEFAULT NULL,
  p_brand       text    DEFAULT NULL,
  p_size        text    DEFAULT NULL,
  p_in_stock    boolean DEFAULT NULL,
  p_limit       int     DEFAULT 24,
  p_offset      int     DEFAULT 0
)
RETURNS TABLE (
  product_id    bigint,
  sku           text,
  title         text,
  engine_code   text,
  category_code text,
  brand_name    text,
  size_code     text,
  insert_type   text,
  image_url     text,
  price_kzt     numeric,
  in_stock      boolean,
  stock_qty     int,
  oem_numbers   text[],
  rank          real,
  total_count   bigint
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_q     text := nullif(btrim(coalesce(q,'')),'');
  v_tsq   tsquery;
  v_qlow  text;
BEGIN
  IF v_q IS NOT NULL THEN
    v_qlow := lower(public.f_unaccent(v_q));
    -- Build a forgiving tsquery: prefix-match on each token.
    v_tsq := websearch_to_tsquery('simple', v_q);
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      m.*,
      CASE
        WHEN v_q IS NULL THEN 0::real
        ELSE
          ts_rank_cd(m.tsv, v_tsq) * 2.0
          + similarity(m.trgm_blob, v_qlow) * 1.0
          + CASE WHEN m.sku ILIKE v_q || '%' THEN 3.0 ELSE 0 END
          + CASE WHEN v_q = ANY (m.oem_numbers) THEN 5.0 ELSE 0 END
      END AS r
    FROM public.mv_search_products m
    WHERE (p_engine   IS NULL OR m.engine_code   = p_engine)
      AND (p_category IS NULL OR m.category_code = p_category)
      AND (p_brand    IS NULL OR m.brand_name    = p_brand)
      AND (p_size     IS NULL OR m.size_code     = p_size)
      AND (p_in_stock IS NULL OR m.in_stock      = p_in_stock)
      AND (
        v_q IS NULL
        OR m.tsv @@ v_tsq
        OR m.trgm_blob % v_qlow
        OR m.sku ILIKE '%' || v_q || '%'
        OR v_q = ANY (m.oem_numbers)
        OR v_q = ANY (m.cross_numbers)
      )
  ),
  counted AS (
    SELECT count(*) AS c FROM filtered
  )
  SELECT
    f.product_id,
    f.sku::text,
    f.title::text,
    f.engine_code::text,
    f.category_code::text,
    f.brand_name::text,
    f.size_code::text,
    f.insert_type::text,
    f.image_url::text,
    f.price_kzt,
    f.in_stock,
    f.stock_qty,
    f.oem_numbers::text[],
    f.r::real AS rank,
    counted.c AS total_count
  FROM filtered f, counted
  ORDER BY f.r DESC, f.in_stock DESC, f.sku ASC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

COMMIT;
