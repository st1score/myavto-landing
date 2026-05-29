'use client';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { CATEGORY_LABEL, type CatalogRow } from '@/lib/types';

function SearchInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<CatalogRow[] | null>(null);

  const q = sp.get('q') ?? '';
  const category = sp.get('category') ?? '';
  const brand = sp.get('brand') ?? '';
  const engine = sp.get('engine') ?? '';
  const inStock = sp.get('in_stock') === '1';

  useEffect(() => {
    const s = supabaseBrowser();
    let req = s.from('v_catalog').select('*').eq('status', 'active');
    if (category) req = req.eq('category_code', category);
    if (brand)    req = req.eq('brand_code', brand);
    if (engine)   req = req.contains('compatible_engines', [engine.toUpperCase()]);
    if (inStock)  req = req.gt('total_stock', 0);
    if (q)        req = req.or(`title.ilike.%${q}%,master_sku.ilike.%${q}%`);
    req.order('created_at', { ascending: false }).limit(120).then(({ data }) => {
      setProducts((data ?? []) as CatalogRow[]);
    });
  }, [q, category, brand, engine, inStock]);

  const facets = useMemo(() => {
    if (!products) return { categories: [], brands: [], engines: [] };
    const counts = (key: 'category_code' | 'brand_code') => {
      const m = new Map<string, number>();
      for (const p of products) m.set(p[key], (m.get(p[key]) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const eng = new Map<string, number>();
    for (const p of products) for (const e of p.compatible_engines) eng.set(e, (eng.get(e) ?? 0) + 1);
    return {
      categories: counts('category_code'),
      brands: counts('brand_code'),
      engines: [...eng.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [products]);

  function setParam(k: string, v: string | null) {
    const next = new URLSearchParams(Array.from(sp.entries()));
    if (v) next.set(k, v); else next.delete(k);
    router.replace(`/search?${next.toString()}`);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <form
        onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); setParam('q', String(fd.get('q') ?? '') || null); }}
        className="flex gap-2 mb-6"
      >
        <input
          name="q" defaultValue={q}
          placeholder="OEM, артикул, двигатель…"
          className="flex-1 border-2 border-black rounded-lg px-4 py-2.5"
        />
        <label className="flex items-center gap-2 text-sm bg-neutral-100 px-3 rounded-lg">
          <input type="checkbox" checked={inStock} onChange={(e) => setParam('in_stock', e.target.checked ? '1' : null)} />В наличии
        </label>
      </form>

      <div className="grid md:grid-cols-[240px_1fr] gap-6">
        <aside className="space-y-4 text-sm">
          <Filter title="Категория" current={category} options={facets.categories.map(([v, n]) => ({ value: v, label: `${CATEGORY_LABEL[v] ?? v} · ${n}` }))} onSet={(v) => setParam('category', v)} />
          <Filter title="Бренд" current={brand} options={facets.brands.map(([v, n]) => ({ value: v, label: `${v} · ${n}` }))} onSet={(v) => setParam('brand', v)} />
          <Filter title="Двигатель" current={engine} options={facets.engines.map(([v, n]) => ({ value: v, label: `${v} · ${n}` }))} onSet={(v) => setParam('engine', v)} />
          {(q || category || brand || engine || inStock) && (
            <button onClick={() => router.replace('/search')} className="border border-neutral-300 rounded-md px-3 py-2 text-sm">Сбросить фильтры</button>
          )}
        </aside>

        <section>
          <div className="text-sm text-neutral-500 mb-3">{products === null ? 'Загрузка…' : `${products.length} товаров`}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {products === null
              ? Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)
              : products.map((p) => <Card key={p.id} p={p} />)}
          </div>
          {products && products.length === 0 && (
            <div className="border border-dashed border-neutral-300 rounded-xl p-10 text-center text-neutral-500">
              Ничего не нашли. Попробуй код двигателя или OEM.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Filter({ title, current, options, onSet }: { title: string; current: string; options: { value: string; label: string }[]; onSet: (v: string | null) => void }) {
  return (
    <div className="border border-neutral-200 rounded-lg p-3">
      <div className="text-xs uppercase tracking-wider font-semibold text-neutral-500 mb-2">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {current && <button onClick={() => onSet(null)} className="bg-black text-white text-xs px-2.5 py-1 rounded-full">× {current}</button>}
        {!current && options.slice(0, 12).map((o) => (
          <button key={o.value} onClick={() => onSet(o.value)} className="bg-neutral-100 hover:bg-neutral-200 text-xs px-2.5 py-1 rounded-full">{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden animate-pulse flex flex-col">
      <div className="aspect-[4/3] bg-neutral-100" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 w-1/3 bg-neutral-100 rounded" />
        <div className="h-3.5 w-full bg-neutral-100 rounded" />
        <div className="h-3 w-2/3 bg-neutral-100 rounded" />
        <div className="h-4 w-1/2 bg-neutral-100 rounded mt-1" />
      </div>
    </div>
  );
}

function Card({ p }: { p: CatalogRow }) {
  const inStock = p.total_stock > 0;
  return (
    <Link href={`/p/${p.id}`} className="bg-white border border-neutral-200 rounded-xl overflow-hidden hover:border-black transition flex flex-col">
      <div className="aspect-[4/3] bg-neutral-50 flex items-center justify-center overflow-hidden">
        {p.image_url
          ? <img src={p.image_url} alt="" className="max-w-full max-h-full object-contain p-3" />
          : <div className="text-neutral-300 text-3xl font-bold">{p.brand_code[0]}</div>}
      </div>
      <div className="p-3 flex flex-col gap-1">
        <div className="text-xs uppercase tracking-wide text-neutral-500 font-semibold flex items-center gap-1.5">
          {p.brand_code} {inStock && <span className="text-green-600">●</span>}
        </div>
        <div className="font-semibold line-clamp-2 text-sm">{p.title}</div>
        <div className="text-xs text-neutral-500">
          {CATEGORY_LABEL[p.category_code] ?? p.category_code}
          {p.variant_count > 1 ? ` · ${p.variant_count} вариантов` : ''}
        </div>
        {p.compatible_engines.length > 0 && (
          <div className="text-xs font-mono text-neutral-600 truncate">{p.compatible_engines.slice(0, 3).join(' · ')}</div>
        )}
        {p.price_own != null && <div className="font-bold mt-1">от {Number(p.price_own).toLocaleString('ru-RU')} ₸</div>}
      </div>
    </Link>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-6 text-neutral-500">Загрузка…</div>}>
      <SearchInner />
    </Suspense>
  );
}
