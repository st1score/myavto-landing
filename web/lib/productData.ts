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

// Memoized once per build process (one Node process) so we don't refetch the
// whole catalog for every product page.
let _catalog: Promise<CatalogLite[]> | null = null;
export function allActiveLite(): Promise<CatalogLite[]> {
  if (!_catalog) {
    _catalog = (async () => {
      const r = await supabaseServer()
        .from('products')
        .select('id, master_sku, category_code, updated_at')
        .eq('status', 'active');
      return (r.data ?? []) as CatalogLite[];
    })();
  }
  return _catalog;
}

/** slug → id map, built once per process. */
let _slugMap: Promise<Map<string, string>> | null = null;
function slugMap(): Promise<Map<string, string>> {
  if (!_slugMap) {
    _slugMap = allActiveLite().then((rows) => {
      const m = new Map<string, string>();
      for (const r of rows) m.set(productSlug(r), r.id);
      return m;
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
  const { data: prod } = await s.from('products').select('*').eq('id', id).eq('status', 'active').maybeSingle();
  if (!prod) return null;

  const [{ data: variants }, { data: media }] = await Promise.all([
    s.from('product_variants').select('*').eq('product_id', id).eq('is_active', true).order('sort_order'),
    s.from('product_media').select('media_id, role, sort_order, media!inner(url)').eq('product_id', id),
  ]);

  const variantIds = (variants ?? []).map((v: any) => v.id);
  const [{ data: listings }, { data: stock }] = await Promise.all([
    variantIds.length > 0 ? s.from('listings').select('*').in('variant_id', variantIds).eq('is_active', true) : Promise.resolve({ data: [] as any[] }),
    variantIds.length > 0 ? s.from('stock').select('*').in('variant_id', variantIds) : Promise.resolve({ data: [] as any[] }),
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
      .limit(4);
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
