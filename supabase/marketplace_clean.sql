-- =====================================================================
-- MY AVTO marketplace — clean schema for a NEW Supabase project.
--
-- Run this once on a fresh project. NOT meant to coexist with legacy
-- tables — it owns canonical names: products, product_variants, listings,
-- stock, media, categories, brands, channels, warehouses.
--
-- Pattern:
--   products       — master "card" (one per real-world part)
--   product_variants — modifications (size, insert) with unique SKU
--   listings       — one per (variant × sales channel) with channel price
--   stock          — per (variant × warehouse)
--   media          — global media library + product/variant join tables
--
-- All RLS-protected:
--   * public reads only products.status='active' rows
--   * owner can read/write own
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------
-- 0. shared updated_at trigger
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ---------------------------------------------------------------------
-- 1. profiles (1:1 auth.users)
-- ---------------------------------------------------------------------
CREATE TABLE public.profiles (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text,
  shop_name  text,
  phone      text,
  role       text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','manager','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_auth_user_to_profile AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. reference: categories / brands / warehouses / channels / engines
-- ---------------------------------------------------------------------
CREATE TABLE public.categories (
  code              text PRIMARY KEY,
  name              text NOT NULL,
  parent_code       text REFERENCES public.categories(code),
  sort_order        int NOT NULL DEFAULT 0,
  attributes_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  kaspi_category_id text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_categories_touch BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.categories(code, name, sort_order) VALUES
  ('PISTON',  'Поршни',       10),
  ('RING',    'Кольца',       20),
  ('BEARING', 'Вкладыши',     30),
  ('LINER',   'Гильзы',       40),
  ('KIT',     'Ремкомплекты', 50);

CREATE TABLE public.brands (
  code       text PRIMARY KEY,
  name       text NOT NULL,
  logo_url   text,
  country    text,
  is_oem     boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_brands_touch BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.brands(code, name, is_oem) VALUES
  ('TEIKIN','TEIKIN',false), ('IZUMI','IZUMI',false),
  ('NPR','NPR',false), ('RIKEN','RIKEN',false),
  ('TAIHO','TAIHO',false), ('NDC','NDC',false),
  ('TP','TP',false), ('OEM','OEM',true);

CREATE TABLE public.warehouses (
  code       text PRIMARY KEY,
  name       text NOT NULL,
  address    text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.warehouses(code, name, address) VALUES
  ('MAIN', 'Главный склад (CarCity)', 'Алматы, ТЦ CarCity, 3 ярус, 135В');

CREATE TABLE public.channels (
  code       text PRIMARY KEY,
  name       text NOT NULL,
  kind       text NOT NULL CHECK (kind IN ('own','marketplace','retail','social')),
  external_base_url text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.channels(code, name, kind, external_base_url) VALUES
  ('OWN',         'my-avto.kz',  'own',         'https://my-avto.kz'),
  ('KASPI',       'Kaspi.kz',     'marketplace','https://kaspi.kz/shop'),
  ('WILDBERRIES', 'Wildberries', 'marketplace','https://www.wildberries.kz'),
  ('OZON',        'Ozon',        'marketplace','https://www.ozon.kz'),
  ('SATU',        'Satu.kz',     'marketplace','https://satu.kz'),
  ('OLX',         'OLX',         'marketplace','https://www.olx.kz');

CREATE TABLE public.engines (
  code         text PRIMARY KEY,
  name         text,
  is_diesel    boolean NOT NULL DEFAULT false,
  displacement numeric(3,1),
  cylinders    int,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_engines_touch BEFORE UPDATE ON public.engines
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.vehicle_makes (
  code text PRIMARY KEY,
  name text NOT NULL
);
CREATE TABLE public.vehicle_models (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make_code  text NOT NULL REFERENCES public.vehicle_makes(code),
  name       text NOT NULL,
  generation text,
  year_from  int,
  year_to    int
);

-- ---------------------------------------------------------------------
-- 3. media (global library)
-- ---------------------------------------------------------------------
CREATE TABLE public.media (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  url           text NOT NULL UNIQUE,
  storage_path  text,
  media_type    text NOT NULL CHECK (media_type IN ('image','video','pdf','3d','doc')),
  mime_type     text,
  alt_text      text,
  width         int,
  height        int,
  bytes         int,
  sha256        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_owner ON public.media(owner_id);

-- ---------------------------------------------------------------------
-- 4. products (master card)
-- ---------------------------------------------------------------------
CREATE TYPE public.product_status AS ENUM ('draft','active','archived');

CREATE TABLE public.products (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  master_sku           text NOT NULL UNIQUE,
  title                text NOT NULL,
  short_desc           text,
  description          text,
  category_code        text NOT NULL REFERENCES public.categories(code),
  brand_code           text NOT NULL REFERENCES public.brands(code),
  oem_numbers          text[] NOT NULL DEFAULT '{}',
  cross_numbers        text[] NOT NULL DEFAULT '{}',
  compatible_engines   text[] NOT NULL DEFAULT '{}',
  status               product_status NOT NULL DEFAULT 'draft',
  seo_title            text,
  seo_desc             text,
  seo_keywords         text[],
  view_count           int NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_products_touch BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_products_owner    ON public.products(owner_id);
CREATE INDEX idx_products_status   ON public.products(status);
CREATE INDEX idx_products_category ON public.products(category_code);
CREATE INDEX idx_products_brand    ON public.products(brand_code);
CREATE INDEX idx_products_engines  ON public.products USING gin(compatible_engines);
CREATE INDEX idx_products_oem      ON public.products USING gin(oem_numbers);
CREATE INDEX idx_products_title    ON public.products USING gin(title gin_trgm_ops);

-- specs (key/value bag, optional structure via categories.attributes_schema)
CREATE TABLE public.product_specs (
  product_id     uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_code text NOT NULL,
  value_text     text,
  value_number   numeric,
  value_boolean  boolean,
  PRIMARY KEY (product_id, attribute_code)
);

CREATE TABLE public.product_vehicle_fitments (
  product_id       uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vehicle_model_id uuid NOT NULL REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  notes            text,
  PRIMARY KEY (product_id, vehicle_model_id)
);

-- product → media
CREATE TABLE public.product_media (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  media_id   uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'gallery' CHECK (role IN ('primary','gallery','schema','spec_sheet','box')),
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, media_id, role)
);
CREATE UNIQUE INDEX uq_product_media_one_primary
  ON public.product_media(product_id) WHERE role = 'primary';

-- ---------------------------------------------------------------------
-- 5. variants (modifications)
-- ---------------------------------------------------------------------
CREATE TABLE public.product_variants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku           text NOT NULL UNIQUE,
  variant_attrs jsonb NOT NULL DEFAULT '{}'::jsonb,
  barcode       text,
  weight_g      int,
  volume_ml     int,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_variants_touch BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_variants_product ON public.product_variants(product_id);
CREATE INDEX idx_variants_active  ON public.product_variants(is_active);

CREATE TABLE public.variant_media (
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  media_id   uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (variant_id, media_id)
);

-- Auto-fill variant.sku if blank: {master_sku}-{size}-{insert}
CREATE OR REPLACE FUNCTION public.fill_variant_sku()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  m text;
  size_part text;
  insert_part text;
BEGIN
  IF NEW.sku IS NOT NULL AND btrim(NEW.sku) <> '' THEN RETURN NEW; END IF;
  SELECT master_sku INTO m FROM public.products WHERE id = NEW.product_id;
  size_part := upper(coalesce(NEW.variant_attrs->>'size', ''));
  size_part := regexp_replace(size_part, '[^A-Z0-9]+', '', 'g');
  insert_part := upper(coalesce(NEW.variant_attrs->>'insert', ''));
  insert_part := regexp_replace(insert_part, '[^A-Z0-9]+', '', 'g');
  NEW.sku := concat_ws('-', m, nullif(insert_part, ''), nullif(size_part, ''));
  RETURN NEW;
END $$;
CREATE TRIGGER trg_variants_fill_sku BEFORE INSERT ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.fill_variant_sku();

-- ---------------------------------------------------------------------
-- 6. listings (variant × channel)
-- ---------------------------------------------------------------------
CREATE TABLE public.listings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id            uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  channel_code          text NOT NULL REFERENCES public.channels(code),
  external_id           text,
  external_url          text,
  external_status       text,
  price                 numeric(12,2),
  compare_at_price      numeric(12,2),
  currency              text NOT NULL DEFAULT 'KZT',
  title_override        text,
  description_override  text,
  is_active             boolean NOT NULL DEFAULT true,
  last_synced_at        timestamptz,
  last_sync_status      text CHECK (last_sync_status IN ('ok','error','pending') OR last_sync_status IS NULL),
  last_sync_error       text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (variant_id, channel_code)
);
CREATE TRIGGER trg_listings_touch BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_listings_variant ON public.listings(variant_id);
CREATE INDEX idx_listings_channel ON public.listings(channel_code);

-- ---------------------------------------------------------------------
-- 7. stock + movements
-- ---------------------------------------------------------------------
CREATE TABLE public.stock (
  variant_id     uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  warehouse_code text NOT NULL REFERENCES public.warehouses(code),
  qty            int  NOT NULL DEFAULT 0 CHECK (qty >= 0),
  reserved_qty   int  NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (variant_id, warehouse_code)
);
CREATE TRIGGER trg_stock_touch BEFORE UPDATE ON public.stock
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_stock_warehouse ON public.stock(warehouse_code);

CREATE TABLE public.stock_movements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id     uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  warehouse_code text REFERENCES public.warehouses(code),
  delta          int NOT NULL,
  reason         text,
  reference_id   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES auth.users(id)
);
CREATE INDEX idx_stock_movements_variant ON public.stock_movements(variant_id);

-- ---------------------------------------------------------------------
-- 8. bulk import
-- ---------------------------------------------------------------------
CREATE TYPE public.import_status AS ENUM ('uploaded','parsing','review','importing','done','failed');

CREATE TABLE public.import_batches (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  source         text NOT NULL CHECK (source IN ('csv','xlsx','kaspi_export','manual','api')),
  file_url       text,
  status         import_status NOT NULL DEFAULT 'uploaded',
  total_rows     int NOT NULL DEFAULT 0,
  imported_rows  int NOT NULL DEFAULT 0,
  failed_rows    int NOT NULL DEFAULT 0,
  error_summary  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_import_batches_touch BEFORE UPDATE ON public.import_batches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.import_rows (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id           uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  row_number         int NOT NULL,
  raw_json           jsonb NOT NULL,
  normalized_json    jsonb,
  target_product_id  uuid REFERENCES public.products(id) ON DELETE SET NULL,
  target_variant_id  uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','imported','rejected','error')),
  error              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, row_number)
);
CREATE INDEX idx_import_rows_batch ON public.import_rows(batch_id);

-- ---------------------------------------------------------------------
-- 9. RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engines                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_makes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_models            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_specs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_vehicle_fitments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_media             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows               ENABLE ROW LEVEL SECURITY;

-- Reference: world-readable, authenticated-writable.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['categories','brands','warehouses','channels','engines','vehicle_makes','vehicle_models']) LOOP
    EXECUTE format('CREATE POLICY p_%I_read ON public.%I FOR SELECT TO anon, authenticated USING (true);', t, t);
    EXECUTE format('CREATE POLICY p_%I_write ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;

-- profiles: own only
CREATE POLICY p_profiles_self ON public.profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- media: public read, owner write
CREATE POLICY p_media_read  ON public.media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY p_media_owner ON public.media FOR ALL    TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- products: public sees active only; owner full control
CREATE POLICY p_products_public_read ON public.products
  FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY p_products_owner ON public.products
  FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- child rows: visible if their product is visible, writable if owner owns parent
CREATE POLICY p_pspecs_read  ON public.product_specs FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.status='active' OR p.owner_id = auth.uid())));
CREATE POLICY p_pspecs_owner ON public.product_specs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_id = auth.uid()));

CREATE POLICY p_pvfit_read  ON public.product_vehicle_fitments FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.status='active' OR p.owner_id = auth.uid())));
CREATE POLICY p_pvfit_owner ON public.product_vehicle_fitments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_id = auth.uid()));

CREATE POLICY p_pmedia_read  ON public.product_media FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.status='active' OR p.owner_id = auth.uid())));
CREATE POLICY p_pmedia_owner ON public.product_media FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_id = auth.uid()));

CREATE POLICY p_pvar_read  ON public.product_variants FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.status='active' OR p.owner_id = auth.uid())));
CREATE POLICY p_pvar_owner ON public.product_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_id = auth.uid()));

CREATE POLICY p_vmedia_read  ON public.variant_media FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.id = variant_id AND (p.status='active' OR p.owner_id = auth.uid())));
CREATE POLICY p_vmedia_owner ON public.variant_media FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.id = variant_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.id = variant_id AND p.owner_id = auth.uid()));

CREATE POLICY p_listings_read  ON public.listings FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.id = variant_id AND (p.status='active' OR p.owner_id = auth.uid())));
CREATE POLICY p_listings_owner ON public.listings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.id = variant_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.id = variant_id AND p.owner_id = auth.uid()));

CREATE POLICY p_stock_read  ON public.stock FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.id = variant_id AND (p.status='active' OR p.owner_id = auth.uid())));
CREATE POLICY p_stock_owner ON public.stock FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.id = variant_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.id = variant_id AND p.owner_id = auth.uid()));

CREATE POLICY p_smov_owner ON public.stock_movements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.id = variant_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.id = variant_id AND p.owner_id = auth.uid()));

-- import: owner only
CREATE POLICY p_imp_batches ON public.import_batches FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY p_imp_rows ON public.import_rows FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.import_batches b WHERE b.id = batch_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.import_batches b WHERE b.id = batch_id AND b.owner_id = auth.uid()));

-- ---------------------------------------------------------------------
-- 10. Storage bucket: product-images
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets(id, name, public) VALUES ('product-images','product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY p_product_images_read ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');
CREATE POLICY p_product_images_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY p_product_images_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY p_product_images_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 11. Convenience views
-- ---------------------------------------------------------------------

-- One row per product with denormalized "primary image", min own-channel price,
-- total stock across warehouses, variant count.
CREATE OR REPLACE VIEW public.v_catalog AS
SELECT
  p.id, p.master_sku, p.title, p.short_desc, p.category_code, p.brand_code,
  p.compatible_engines, p.oem_numbers, p.status,
  (SELECT m.url FROM public.product_media pm JOIN public.media m ON m.id=pm.media_id
    WHERE pm.product_id=p.id AND pm.role='primary' ORDER BY pm.sort_order LIMIT 1) AS image_url,
  (SELECT MIN(l.price) FROM public.listings l JOIN public.product_variants pv ON pv.id=l.variant_id
    WHERE pv.product_id=p.id AND l.channel_code='OWN' AND l.is_active) AS price_own,
  (SELECT COUNT(*) FROM public.product_variants pv WHERE pv.product_id=p.id AND pv.is_active) AS variant_count,
  (SELECT COALESCE(SUM(s.qty),0) FROM public.stock s JOIN public.product_variants pv ON pv.id=s.variant_id
    WHERE pv.product_id=p.id) AS total_stock,
  p.created_at, p.updated_at
FROM public.products p;

-- Listings ⇄ marketplace status snapshot
CREATE OR REPLACE VIEW public.v_listings_summary AS
SELECT
  l.id, p.id AS product_id, p.title, pv.sku AS variant_sku, l.channel_code,
  l.external_id, l.price, l.is_active, l.last_synced_at, l.last_sync_status, l.last_sync_error
FROM public.listings l
JOIN public.product_variants pv ON pv.id = l.variant_id
JOIN public.products p ON p.id = pv.product_id;

COMMIT;
