-- =====================================================================
-- Marketplace v1: fresh schema for the new Next.js + Supabase project.
--
-- Independent of legacy tables (engines, part_variant_sizes, etc).
-- Multi-seller-ready: products.owner_id → auth.users.id. RLS enforces
-- "writers must own the row"; public reads see only is_published=true rows.
--
-- Storage bucket `product-images` is also created here. RLS grants:
--   * SELECT to anon       (public read)
--   * ALL    to owner only (authenticated user uploads/edits own files)
--
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT).
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 0. updated_at touch trigger (idempotent — may already exist)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mp_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ---------------------------------------------------------------------
-- 1. profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  shop_name   text,
  phone       text,
  role        text NOT NULL DEFAULT 'seller'
    CHECK (role IN ('owner','seller','viewer')),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_profiles_touch ON public.profiles;
CREATE TRIGGER trg_profiles_touch
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.mp_touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.mp_handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_auth_user_to_profile ON auth.users;
CREATE TRIGGER trg_auth_user_to_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.mp_handle_new_user();

-- ---------------------------------------------------------------------
-- 2. reference tables
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mp_engines (
  code         text PRIMARY KEY,
  name         text,
  is_diesel    boolean NOT NULL DEFAULT false,
  displacement numeric(3,1),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_mp_engines_touch ON public.mp_engines;
CREATE TRIGGER trg_mp_engines_touch
  BEFORE UPDATE ON public.mp_engines
  FOR EACH ROW EXECUTE FUNCTION public.mp_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.mp_categories (
  code       text PRIMARY KEY,
  name       text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_mp_categories_touch ON public.mp_categories;
CREATE TRIGGER trg_mp_categories_touch
  BEFORE UPDATE ON public.mp_categories
  FOR EACH ROW EXECUTE FUNCTION public.mp_touch_updated_at();

INSERT INTO public.mp_categories (code, name, sort_order) VALUES
  ('PISTON',  'Поршни',         10),
  ('RING',    'Кольца',         20),
  ('BEARING', 'Вкладыши',       30),
  ('LINER',   'Гильзы',         40),
  ('KIT',     'Ремкомплекты',   50)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.mp_brands (
  code       text PRIMARY KEY,
  name       text NOT NULL,
  logo_url   text,
  country    text,
  is_oem     boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_mp_brands_touch ON public.mp_brands;
CREATE TRIGGER trg_mp_brands_touch
  BEFORE UPDATE ON public.mp_brands
  FOR EACH ROW EXECUTE FUNCTION public.mp_touch_updated_at();

INSERT INTO public.mp_brands (code, name, is_oem) VALUES
  ('TEIKIN', 'TEIKIN', false),
  ('IZUMI',  'IZUMI',  false),
  ('NPR',    'NPR',    false),
  ('RIKEN',  'RIKEN',  false),
  ('TAIHO',  'TAIHO',  false),
  ('NDC',    'NDC',    false),
  ('TP',     'TP',     false),
  ('OEM',    'OEM',    true)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. products
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products_v2 (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title               text NOT NULL,
  description         text,
  category_code       text NOT NULL REFERENCES public.mp_categories(code),
  brand_code          text NOT NULL REFERENCES public.mp_brands(code),
  sku                 text UNIQUE,
  oem_numbers         text[] NOT NULL DEFAULT '{}',
  cross_numbers       text[] NOT NULL DEFAULT '{}',
  compatible_engines  text[] NOT NULL DEFAULT '{}',
  image_url           text,
  price_kzt           numeric(12,2),
  in_stock            boolean NOT NULL DEFAULT true,
  qty                 int  NOT NULL DEFAULT 0,
  size_code           text,
  insert_type         text,
  is_published        boolean NOT NULL DEFAULT true,
  view_count          int NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_products_v2_touch ON public.products_v2;
CREATE TRIGGER trg_products_v2_touch
  BEFORE UPDATE ON public.products_v2
  FOR EACH ROW EXECUTE FUNCTION public.mp_touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_products_v2_owner       ON public.products_v2 (owner_id);
CREATE INDEX IF NOT EXISTS idx_products_v2_category    ON public.products_v2 (category_code);
CREATE INDEX IF NOT EXISTS idx_products_v2_brand       ON public.products_v2 (brand_code);
CREATE INDEX IF NOT EXISTS idx_products_v2_published   ON public.products_v2 (is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_products_v2_in_stock    ON public.products_v2 (in_stock);
CREATE INDEX IF NOT EXISTS idx_products_v2_engines_gin ON public.products_v2 USING gin (compatible_engines);
CREATE INDEX IF NOT EXISTS idx_products_v2_oem_gin     ON public.products_v2 USING gin (oem_numbers);
CREATE INDEX IF NOT EXISTS idx_products_v2_cross_gin   ON public.products_v2 USING gin (cross_numbers);
CREATE INDEX IF NOT EXISTS idx_products_v2_title_trgm  ON public.products_v2 USING gin (title gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 4. product_images (gallery)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_images_v2 (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products_v2(id) ON DELETE CASCADE,
  url         text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pimg_v2_product ON public.product_images_v2 (product_id);

-- ---------------------------------------------------------------------
-- 5. Enable RLS + policies
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_engines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_brands         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_v2       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images_v2 ENABLE ROW LEVEL SECURITY;

-- Reference tables: readable by anyone, writable only by authenticated.
DROP POLICY IF EXISTS p_mp_engines_read    ON public.mp_engines;
DROP POLICY IF EXISTS p_mp_engines_write   ON public.mp_engines;
CREATE POLICY p_mp_engines_read  ON public.mp_engines  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY p_mp_engines_write ON public.mp_engines  FOR ALL    TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_mp_categories_read  ON public.mp_categories;
DROP POLICY IF EXISTS p_mp_categories_write ON public.mp_categories;
CREATE POLICY p_mp_categories_read  ON public.mp_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY p_mp_categories_write ON public.mp_categories FOR ALL    TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_mp_brands_read  ON public.mp_brands;
DROP POLICY IF EXISTS p_mp_brands_write ON public.mp_brands;
CREATE POLICY p_mp_brands_read  ON public.mp_brands FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY p_mp_brands_write ON public.mp_brands FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- profiles: own row visible/writable; nobody else.
DROP POLICY IF EXISTS p_profiles_self ON public.profiles;
CREATE POLICY p_profiles_self ON public.profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- products_v2:
--   public read     → only is_published
--   owner read/write → own rows regardless of publish status
DROP POLICY IF EXISTS p_products_public_read ON public.products_v2;
DROP POLICY IF EXISTS p_products_owner_all   ON public.products_v2;
CREATE POLICY p_products_public_read ON public.products_v2
  FOR SELECT TO anon, authenticated
  USING (is_published = true);
CREATE POLICY p_products_owner_all ON public.products_v2
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- product_images_v2:
--   public read   → always (image gallery is public)
--   owner write → only on products they own
DROP POLICY IF EXISTS p_pimg_public_read ON public.product_images_v2;
DROP POLICY IF EXISTS p_pimg_owner_all   ON public.product_images_v2;
CREATE POLICY p_pimg_public_read ON public.product_images_v2
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY p_pimg_owner_all ON public.product_images_v2
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products_v2 p WHERE p.id = product_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products_v2 p WHERE p.id = product_id AND p.owner_id = auth.uid()));

-- ---------------------------------------------------------------------
-- 6. Storage bucket: product-images
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS:
--   public SELECT
--   authenticated INSERT/UPDATE/DELETE only into folders prefixed with their uid
DROP POLICY IF EXISTS p_product_images_read   ON storage.objects;
DROP POLICY IF EXISTS p_product_images_insert ON storage.objects;
DROP POLICY IF EXISTS p_product_images_update ON storage.objects;
DROP POLICY IF EXISTS p_product_images_delete ON storage.objects;

CREATE POLICY p_product_images_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY p_product_images_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY p_product_images_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY p_product_images_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- 7. v_related_for_engines view — "другие запчасти для тех же моторов"
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_related_for_engines AS
SELECT
  p2.id,
  p2.title,
  p2.image_url,
  p2.price_kzt,
  p2.in_stock,
  p2.category_code,
  p2.brand_code,
  p2.compatible_engines,
  origin.id AS for_product_id,
  origin.compatible_engines && p2.compatible_engines AS engines_match
FROM public.products_v2 origin
JOIN public.products_v2 p2
  ON p2.id <> origin.id
 AND p2.is_published = true
 AND origin.compatible_engines && p2.compatible_engines;

COMMIT;
