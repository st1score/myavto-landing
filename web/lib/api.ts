/**
 * Django REST API client (new backend).
 *
 * MIGRATION NOTE: this lives ALONGSIDE the existing Supabase data path
 * (lib/supabase, lib/productData.ts). Nothing here replaces that yet — screens
 * are switched over to the Django API one at a time. Until then both work.
 *
 * Base URL comes from NEXT_PUBLIC_API_URL (set in web/.env.local), e.g.
 *   NEXT_PUBLIC_API_URL=http://localhost:8000
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:8000';

export type ApiProduct = {
  id: string;
  master_sku: string;
  title: string;
  category_code: string | null;
  brand_code: string | null;
  oem_numbers: string[] | null;
  cross_numbers: string[] | null;
  compatible_engines: string[] | null;
  status: string;
  seo_title: string | null;
  seo_desc: string | null;
  seo_keywords: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`API ${path} -> ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function fetchActiveProducts(): Promise<Paginated<ApiProduct>> {
  return apiGet<Paginated<ApiProduct>>('/products/');
}

export function fetchProductBySku(masterSku: string): Promise<ApiProduct> {
  return apiGet<ApiProduct>(`/products/${encodeURIComponent(masterSku)}/`);
}
