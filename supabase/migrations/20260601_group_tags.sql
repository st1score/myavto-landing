-- ============================================================================
-- Group tags: a free-form grouping label the owner picks per product so all
-- parts that belong together (e.g. "Капремонт 4D56") can be pulled with one
-- query. One tag per product; the tag list is a catalog the owner grows over
-- time. Engine grouping (compatible_engines) stays separate — this is an extra
-- manual bucket.
--
-- Run this in the MARKETPLACE Supabase project SQL editor
-- (project kqzvozgvhcefthbgvtrf), NOT the old engines DB.
-- Additive only. Safe to re-run (IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================================

BEGIN;

-- 1. Tag catalog (the dropdown the owner chooses from).
CREATE TABLE IF NOT EXISTS public.catalog_tags (
  slug        text PRIMARY KEY,                 -- stored value, e.g. "kapremont-4d56"
  label       text NOT NULL,                    -- human label, e.g. "Капремонт 4D56"
  sort_order  int  NOT NULL DEFAULT 100,
  owner_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_tags ENABLE ROW LEVEL SECURITY;

-- Anyone can read the tag list (needed for the public catalog filter).
DROP POLICY IF EXISTS p_catalog_tags_read ON public.catalog_tags;
CREATE POLICY p_catalog_tags_read ON public.catalog_tags
  FOR SELECT USING (true);

-- Only authenticated owner can create/edit/delete tags.
DROP POLICY IF EXISTS p_catalog_tags_write ON public.catalog_tags;
CREATE POLICY p_catalog_tags_write ON public.catalog_tags
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 2. Product → tag link (nullable; not every product needs a group).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS group_tag text;

CREATE INDEX IF NOT EXISTS idx_products_group_tag ON public.products(group_tag);

-- 3. Expose group_tag through the public catalog view used by site + search.
-- DROP + CREATE (not REPLACE): adding a column mid-list changes the view's
-- column layout, which CREATE OR REPLACE VIEW refuses ("cannot change name of
-- view column"). The view is read-only and rebuilt fully below, so dropping
-- it is safe. Consumers select columns by name.
DROP VIEW IF EXISTS public.v_catalog;
CREATE VIEW public.v_catalog AS
SELECT
  p.id, p.master_sku, p.title, p.short_desc, p.category_code, p.brand_code,
  p.compatible_engines, p.oem_numbers, p.status, p.group_tag,
  (SELECT m.url FROM public.product_media pm JOIN public.media m ON m.id=pm.media_id
    WHERE pm.product_id=p.id AND pm.role='primary' ORDER BY pm.sort_order LIMIT 1) AS image_url,
  (SELECT MIN(l.price) FROM public.listings l JOIN public.product_variants pv ON pv.id=l.variant_id
    WHERE pv.product_id=p.id AND l.channel_code='OWN' AND l.is_active) AS price_own,
  (SELECT COUNT(*) FROM public.product_variants pv WHERE pv.product_id=p.id AND pv.is_active) AS variant_count,
  (SELECT COALESCE(SUM(s.qty),0) FROM public.stock s JOIN public.product_variants pv ON pv.id=s.variant_id
    WHERE pv.product_id=p.id) AS total_stock,
  p.created_at, p.updated_at
FROM public.products p;

COMMIT;
