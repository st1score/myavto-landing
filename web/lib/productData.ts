import { supabaseServer } from '@/lib/supabase/server';
import { productSlug } from '@/lib/slug';
import type { Product, ProductVariant, Listing, Stock } from '@/lib/types';

export type RelatedRow = {
  id: string; title: string; brand_code: string; category_code: string;
  image_url: string | null; price_own: number | null; master_sku: string;
  total_stock: number; compatible_engines: string[];
};

export type FullProduct = Product & {
  slug: string;
  variants: ProductVariant[];
  listings: Listing[];
  stock: Stock[];
  images: string[];
  related: RelatedRow[];
};

type CatalogLite = { id: string; master_sku: string; category_code: string; updated_at: string };

/**
 * Run a Supabase query with retry + backoff. CRITICAL for the static build:
 * under parallel page generation (many workers) the pooler occasionally drops a
 * request and PostgREST returns `{ data: null, error }`. Swallowing that error
 * silently 404s a REAL product. So we retry transient errors and, if they
 * persist, THROW — failing the build loudly instead of shipping a dead page.
 */
async function q<T>(
  run: () => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  what: string,
  tries = 4,
): Promise<T> {
  let lastErr = '';
  for (let i = 0; i < tries; i++) {
    const { data, error } = await run();
    if (!error) return data as T;
    lastErr = error.message;
    await new Promise((r) => setTimeout(r, 150 * 2 ** i)); // 150ms, 300, 600, 1200
  }
  throw new Error(`Supabase query failed after ${tries} tries (${what}): ${lastErr}`);
}

// Memoized once per build process so we don't refetch the whole catalog for
// every product page. A failed fetch is NOT cached (reset to null) so the next
// caller retries instead of inheriting a poisoned empty catalog.
let _catalog: Promise<CatalogLite[]> | null = null;
export function allActiveLite(): Promise<CatalogLite[]> {
  if (!_catalog) {
    _catalog = q<CatalogLite[]>(
      () => supabaseServer().from('products').select('id, master_sku, category_code, updated_at').eq('status', 'active'),
      'allActiveLite',
    ).catch((e) => {
      _catalog = null;
      throw e;
    });
  }
  return _catalog;
}

/** slug → id map, built once per process. */
let _slugMap: Promise<Map<string, string>> | null = null;
function slugMap(): Promise<Map<string, string>> {
  if (!_slugMap) {
    _slugMap = allActiveLite()
      .then((rows) => {
        const m = new Map<string, string>();
        for (const r of rows) m.set(productSlug(r), r.id);
        return m;
      })
      .catch((e) => {
        _slugMap = null;
        throw e;
      });
  }
  return _slugMap;
}

export async function allProductSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  const rows = await allActiveLite();
  return rows.map((r) => ({ slug: productSlug(r), updated_at: r.updated_at }));
}

export async function fetchFullProductById(id: string): Promise<FullProduct | null> {
  const s = supabaseServer();
  // maybeSingle: genuine 0-rows → null (real 404). Transient error → q() retries
  // then throws (build fails loudly) instead of returning a misleading null.
  const prod = await q(
    () => s.from('products').select('*').eq('id', id).eq('status', 'active').maybeSingle(),
    `product ${id}`,
  );
  if (!prod) return null;

  const [variants, media] = await Promise.all([
    q<any[]>(() => s.from('product_variants').select('*').eq('product_id', id).eq('is_active', true).order('sort_order'), `variants ${id}`),
    q<any[]>(() => s.from('product_media').select('media_id, role, sort_order, media!inner(url)').eq('product_id', id), `media ${id}`),
  ]);

  const variantIds = (variants ?? []).map((v: any) => v.id);
  const [listings, stock] = await Promise.all([
    variantIds.length > 0 ? q<any[]>(() => s.from('listings').select('*').in('variant_id', variantIds).eq('is_active', true), `listings ${id}`) : Promise.resolve([] as any[]),
    variantIds.length > 0 ? q<any[]>(() => s.from('stock').select('*').in('variant_id', variantIds), `stock ${id}`) : Promise.resolve([] as any[]),
  ]);

  const sortedMedia = [...(media ?? [])].sort((a: any, b: any) => {
    if (a.role === 'primary' && b.role !== 'primary') return -1;
    if (b.role === 'primary' && a.role !== 'primary') return 1;
    return a.sort_order - b.sort_order;
  });
  const images = sortedMedia.map((m: any) => m.media?.url).filter(Boolean) as string[];

  let related: RelatedRow[] = [];
  if ((prod as Product).compatible_engines.length > 0) {
    const { data: rel } = await s.from('v_catalog').select('*')
      .eq('status', 'active')
      .neq('id', (prod as Product).id)
      .overlaps('compatible_engines', (prod as Product).compatible_engines)
      .order('total_stock', { ascending: false })
      .limit(12);
    related = (rel ?? []) as any;
  }

  return {
    ...(prod as Product),
    slug: productSlug(prod as Product),
    variants: (variants ?? []) as ProductVariant[],
    listings: (listings ?? []) as Listing[],
    stock: (stock ?? []) as Stock[],
    images,
    related,
  };
}

export async function fetchFullProductBySlug(slug: string): Promise<FullProduct | null> {
  const id = (await slugMap()).get(slug);
  if (!id) return null;
  return fetchFullProductById(id);
}
