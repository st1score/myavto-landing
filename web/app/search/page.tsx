'use client';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { CATEGORY_LABEL, type CatalogRow } from '@/lib/types';
import { Icon } from '@/components/Icon';
import ProductCard from '@/components/ProductCard';
import { partsBrandLogo, waLink } from '@/lib/ui';

function SearchInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<CatalogRow[] | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // When the literal query found nothing, we keep it here to show the "не нашли,
  // напишите в WhatsApp" banner. engineFallback = engine codes we recognised in
  // the query, used to show all parts we DO stock for that engine.
  const [notFoundQuery, setNotFoundQuery] = useState<string | null>(null);
  const [engineFallback, setEngineFallback] = useState<string[] | null>(null);

  const q = sp.get('q') ?? '';
  const category = sp.get('category') ?? '';
  const brand = sp.get('brand') ?? '';
  const engine = sp.get('engine') ?? '';
  const tag = sp.get('tag') ?? '';
  const inStock = sp.get('in_stock') === '1';

  useEffect(() => {
    const s = supabaseBrowser();
    setProducts(null);
    setNotFoundQuery(null);
    setEngineFallback(null);

    (async () => {
      let req = s.from('v_catalog').select('*').eq('status', 'active');
      if (category) req = req.eq('category_code', category);
      if (brand)    req = req.eq('brand_code', brand);
      if (engine)   req = req.contains('compatible_engines', [engine.toUpperCase()]);
      if (tag)      req = req.eq('group_tag', tag);
      if (inStock)  req = req.gt('total_stock', 0);
      if (q)        req = req.or(`title.ilike.%${q}%,master_sku.ilike.%${q}%,oem_numbers.cs.{${q}}`);
      const { data } = await req.order('created_at', { ascending: false }).limit(120);
      let rows = (data ?? []) as CatalogRow[];

      // Smart fallback: the text query matched nothing. The user likely typed an
      // engine code or a part number we don't list yet. Recognise engine tokens
      // and surface everything we DO stock for that engine, with a banner saying
      // the exact item isn't on the site (but may be in stock — write WhatsApp).
      if (rows.length === 0 && q) {
        const tokens = q.toUpperCase().split(/[^A-ZА-Я0-9-]+/).filter((t) => t.length >= 2);
        if (tokens.length) {
          let er = s.from('v_catalog').select('*').eq('status', 'active').overlaps('compatible_engines', tokens);
          if (category) er = er.eq('category_code', category);
          if (inStock)  er = er.gt('total_stock', 0);
          const { data: ed } = await er.order('total_stock', { ascending: false }).limit(120);
          const erows = (ed ?? []) as CatalogRow[];
          if (erows.length) {
            const matched = new Set<string>();
            for (const r of erows) for (const e of r.compatible_engines) if (tokens.includes(e)) matched.add(e);
            setEngineFallback([...matched]);
            rows = erows;
          }
        }
        setNotFoundQuery(q);
      }
      setProducts(rows);
    })();
  }, [q, category, brand, engine, tag, inStock]);

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
  const toggle = (k: string, cur: string, v: string) => setParam(k, cur === v ? null : v);

  const title = tag ? `Запчасти: ${tag}` : category ? (CATEGORY_LABEL[category] ?? category) : 'Каталог запчастей';
  const hasFilters = !!(q || category || brand || engine || tag || inStock);

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Главная</Link> <Icon name="chevR" size={14} />
            <span>Каталог</span>
            {category && <><Icon name="chevR" size={14} /><span>{CATEGORY_LABEL[category] ?? category}</span></>}
          </div>
          <h1>{title}{products && <span>· {products.length} позиций</span>}</h1>
        </div>
      </div>

      <div className="container">
        <div className="catalog">
          <aside className={'filters' + (filtersOpen ? ' is-open' : '')}>
            <div className="fbox">
              <h5>Наличие</h5>
              <button className={'fopt' + (inStock ? ' is-on' : '')} onClick={() => setParam('in_stock', inStock ? null : '1')}>
                <span className="box"><Icon name="check" size={12} /></span> Только в наличии
              </button>
            </div>

            {facets.categories.length > 0 && (
              <div className="fbox">
                <h5>Категория {category && <span className="clear" onClick={() => setParam('category', null)}>Сбросить</span>}</h5>
                {facets.categories.map(([v, n]) => (
                  <button key={v} className={'fopt' + (category === v ? ' is-on' : '')} onClick={() => toggle('category', category, v)}>
                    <span className="box"><Icon name="check" size={12} /></span>
                    {CATEGORY_LABEL[v] ?? v} <span className="cnt">{n}</span>
                  </button>
                ))}
              </div>
            )}

            {facets.brands.length > 0 && (
              <div className="fbox">
                <h5>Бренд запчасти {brand && <span className="clear" onClick={() => setParam('brand', null)}>Сбросить</span>}</h5>
                {facets.brands.map(([v, n]) => {
                  const logo = partsBrandLogo(v);
                  return (
                    <button key={v} className={'fopt' + (brand === v ? ' is-on' : '')} onClick={() => toggle('brand', brand, v)}>
                      <span className="box"><Icon name="check" size={12} /></span>
                      {logo && <span className="frow-logo"><img src={logo} alt={v} /></span>}
                      {v} <span className="cnt">{n}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {facets.engines.length > 0 && (
              <div className="fbox">
                <h5>Двигатель {engine && <span className="clear" onClick={() => setParam('engine', null)}>Сбросить</span>}</h5>
                {facets.engines.slice(0, 14).map(([v, n]) => (
                  <button key={v} className={'fopt' + (engine === v ? ' is-on' : '')} onClick={() => toggle('engine', engine, v)}>
                    <span className="box"><Icon name="check" size={12} /></span>
                    <span className="mono">{v}</span> <span className="cnt">{n}</span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <main className="catalog__main">
            <div className="toolbar">
              <button className="filter-toggle" onClick={() => setFiltersOpen((v) => !v)}>
                <Icon name="sliders" size={17} /> Фильтры
              </button>
              <form
                className="tsearch" onSubmit={(e) => { e.preventDefault(); setParam('q', String(new FormData(e.currentTarget).get('q') ?? '').trim() || null); }}
              >
                <Icon name="search" size={18} />
                <input name="q" defaultValue={q} placeholder="Поиск по артикулу, названию или двигателю" />
              </form>
            </div>

            {hasFilters && (
              <div className="active-filters">
                {q && <span className="afilter">«{q}» <button onClick={() => setParam('q', null)}><Icon name="x" size={11} /></button></span>}
                {category && <span className="afilter">{CATEGORY_LABEL[category] ?? category} <button onClick={() => setParam('category', null)}><Icon name="x" size={11} /></button></span>}
                {brand && <span className="afilter">{brand} <button onClick={() => setParam('brand', null)}><Icon name="x" size={11} /></button></span>}
                {engine && <span className="afilter">{engine} <button onClick={() => setParam('engine', null)}><Icon name="x" size={11} /></button></span>}
                {tag && <span className="afilter">Тег: {tag} <button onClick={() => setParam('tag', null)}><Icon name="x" size={11} /></button></span>}
                {inStock && <span className="afilter">В наличии <button onClick={() => setParam('in_stock', null)}><Icon name="x" size={11} /></button></span>}
                <button className="chip" onClick={() => router.replace('/search')}>Сбросить всё</button>
              </div>
            )}

            {notFoundQuery && (
              <div className="search-miss">
                <div className="search-miss__txt">
                  <b>«{notFoundQuery}» пока нет на сайте.</b>
                  <span>Эта запчасть может быть в ассортименте — мы ещё не всё добавили. Напишите в WhatsApp, подберём и скажем цену.</span>
                  {engineFallback && engineFallback.length > 0 && (
                    <span className="search-miss__eng">
                      А вот что уже есть для двигателя <b className="mono">{engineFallback.join(', ')}</b>:
                    </span>
                  )}
                </div>
                <a
                  className="search-miss__wa"
                  href={waLink(`Здравствуйте! Ищу запчасть по запросу «${notFoundQuery}». Есть в наличии?`)}
                  target="_blank" rel="noopener"
                >
                  Написать в WhatsApp
                </a>
              </div>
            )}

            <div className="grid-products">
              {products === null
                ? Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)
                : products.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>

            {products && products.length === 0 && !notFoundQuery && (
              <div className="empty">Ничего не нашли. Попробуй код двигателя или OEM-номер.</div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

function CardSkeleton() {
  return (
    <div className="pcard" style={{ pointerEvents: 'none' }}>
      <div className="pcard__media" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div className="pcard__body">
        <div style={{ height: 14, width: '90%', background: 'var(--c-bg-soft)', borderRadius: 6 }} />
        <div style={{ height: 12, width: '50%', background: 'var(--c-bg-soft)', borderRadius: 6 }} />
        <div className="pcard__foot">
          <div style={{ height: 20, width: 80, background: 'var(--c-bg-soft)', borderRadius: 6 }} />
          <div style={{ width: 46, height: 46, background: 'var(--c-bg-soft)', borderRadius: 10 }} />
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '40px 24px', color: 'var(--c-muted)' }}>Загрузка…</div>}>
      <SearchInner />
    </Suspense>
  );
}
