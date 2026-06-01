export type Category = { code: string; name: string; sort_order: number; parent_code: string | null; kaspi_category_id: string | null };
export type Brand    = { code: string; name: string; logo_url: string | null; is_oem: boolean };
export type Engine   = { code: string; name: string | null; is_diesel: boolean; displacement: number | null; cylinders: number | null };
export type CatalogTag = { slug: string; label: string; sort_order: number };
export type Warehouse = { code: string; name: string; address: string | null };
export type Channel  = { code: string; name: string; kind: 'own' | 'marketplace' | 'retail' | 'social'; is_active: boolean };

export type ProductStatus = 'draft' | 'active' | 'archived';

export type KaspiVehicle = { brand: string; model: string; year_from?: number | null; year_to?: number | null };

export type Product = {
  id: string;
  owner_id: string;
  master_sku: string;
  title: string;
  short_desc: string | null;
  description: string | null;
  category_code: string;
  brand_code: string;
  oem_numbers: string[];
  cross_numbers: string[];
  compatible_engines: string[];
  group_tag: string | null;
  status: ProductStatus;
  seo_title: string | null;
  seo_desc: string | null;
  seo_keywords: string[] | null;
  view_count: number;

  // Kaspi extensions
  manufacturer_part_number: string | null;
  kaspi_type: string | null;
  youtube_id: string | null;
  kaspi_image_code: string | null;
  weight_kg: number | null;
  additional_info: string | null;
  kaspi_vehicles: KaspiVehicle[];

  created_at: string;
  updated_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  sku: string;
  variant_attrs: Record<string, any>;
  barcode: string | null;
  weight_g: number | null;
  volume_ml: number | null;
  is_active: boolean;
  sort_order: number;
};

export type Listing = {
  id: string;
  variant_id: string;
  channel_code: string;
  external_id: string | null;
  external_url: string | null;
  external_status: string | null;
  price: number | null;
  price_usd: number | null;
  exchange_rate: number | null;
  margin_percent: number | null;
  compare_at_price: number | null;
  currency: string;
  title_override: string | null;
  description_override: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  last_sync_status: 'ok' | 'error' | 'pending' | null;
  last_sync_error: string | null;
};

export type Stock = {
  variant_id: string;
  warehouse_code: string;
  qty: number;
  reserved_qty: number;
};

export type Media = {
  id: string;
  owner_id: string;
  url: string;
  storage_path: string | null;
  media_type: 'image' | 'video' | 'pdf' | '3d' | 'doc';
  mime_type: string | null;
  alt_text: string | null;
};

// v_catalog row shape
export type CatalogRow = {
  id: string;
  master_sku: string;
  title: string;
  short_desc: string | null;
  category_code: string;
  brand_code: string;
  compatible_engines: string[];
  oem_numbers: string[];
  group_tag: string | null;
  status: ProductStatus;
  image_url: string | null;
  price_own: number | null;
  variant_count: number;
  total_stock: number;
  created_at: string;
  updated_at: string;
};

export const CATEGORY_LABEL: Record<string, string> = {
  PISTON: 'Поршни', RING: 'Кольца', BEARING: 'Вкладыши', LINER: 'Гильзы', KIT: 'Ремкомплекты',
};

// Kaspi "type" enum values for category PISTON. Real list is huge — start small.
export const KASPI_TYPE_BY_CATEGORY: Record<string, string[]> = {
  PISTON:  ['Поршень', 'Палец поршневой', 'Стопорное кольцо'],
  RING:    ['Кольцо поршневое', 'Маслосъёмное кольцо'],
  BEARING: ['Вкладыш коренной', 'Вкладыш шатунный', 'Упорное полукольцо'],
  LINER:   ['Гильза'],
  KIT:     ['Ремкомплект'],
};
