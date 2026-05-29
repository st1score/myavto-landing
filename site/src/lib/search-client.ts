// Client-side fuzzy search over the baked engine+category index.
// One row = one (engine_code, category_code) pair. SKU-level variants live
// inside the product page.

export type SearchProduct = {
  engine_code: string;
  category_code: string;
  category_label: string;
  title: string;
  slug: string; // e.g. "1kz/porshni"
  image_url: string | null;
  in_stock: boolean;
  stock_qty: number;
  variant_count: number;
  brand_count: number;
  size_count: number;
  brands: string[];
  sizes: string[];
  oem_numbers: string[];
  cross_numbers: string[];
  engine_aliases: string[];
  vehicles: string[];
  price_from: string | number | null;
};

export type SearchIndex = { generated_at: string; count: number; products: SearchProduct[] };

let cache: Promise<SearchIndex> | null = null;
export function loadSearchIndex(): Promise<SearchIndex> {
  if (cache) return cache;
  cache = fetch('/search-index.json', { cache: 'no-cache' })
    .then((r) => r.ok ? r.json() : { generated_at: '', count: 0, products: [] })
    .catch(() => ({ generated_at: '', count: 0, products: [] }));
  return cache;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_/]+/g, '');

function haystack(p: SearchProduct): string {
  return [
    p.title,
    p.engine_code,
    p.category_label,
    p.category_code,
    ...(p.brands ?? []),
    ...(p.sizes ?? []),
    ...(p.oem_numbers ?? []),
    ...(p.cross_numbers ?? []),
    ...(p.engine_aliases ?? []),
    ...(p.vehicles ?? []),
  ].join(' ').toLowerCase();
}

export type Filters = {
  q?: string;
  engine?: string;
  category?: string;
  brand?: string;
  size?: string;
  inStockOnly?: boolean;
};

export function filterProducts(products: SearchProduct[], f: Filters): SearchProduct[] {
  const q = (f.q ?? '').trim().toLowerCase();
  const qn = norm(q);
  const tokens = q.split(/\s+/).filter(Boolean);

  const filtered = products.filter((p) => {
    if (f.engine   && p.engine_code   !== f.engine)   return false;
    if (f.category && p.category_code !== f.category) return false;
    if (f.brand    && !(p.brands ?? []).includes(f.brand)) return false;
    if (f.size     && !(p.sizes ?? []).includes(f.size))   return false;
    if (f.inStockOnly && !p.in_stock) return false;
    if (!q) return true;
    const hs = haystack(p);
    const hsn = norm(hs);
    return tokens.every((t) => hs.includes(t) || hsn.includes(norm(t)));
  });

  if (!q) return filtered;

  return filtered
    .map((p) => {
      let score = 0;
      if (p.engine_code.toLowerCase() === q) score += 8;
      if (p.engine_code.toLowerCase().startsWith(q)) score += 4;
      if (p.engine_aliases?.some((a) => a.toLowerCase() === q)) score += 6;
      if (p.oem_numbers?.some((o) => o.toLowerCase() === q)) score += 5;
      if (p.oem_numbers?.some((o) => o.toLowerCase().includes(q))) score += 2;
      if (p.title.toLowerCase().includes(q)) score += 1;
      if (p.in_stock) score += 0.5;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}
