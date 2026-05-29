import { useEffect, useMemo, useState } from 'react';
import { loadSearchIndex, filterProducts, type SearchProduct } from '../../lib/search-client';

const CATEGORY_LABEL: Record<string, string> = {
  PISTON: 'Поршни', RING: 'Кольца', BEARING: 'Вкладыши', LINER: 'Гильзы', KIT: 'Ремкомплекты',
};

function urlState() {
  const sp = new URLSearchParams(window.location.search);
  return {
    q: sp.get('q') ?? '',
    engine: sp.get('engine') ?? '',
    category: sp.get('category') ?? '',
    brand: sp.get('brand') ?? '',
    size: sp.get('size') ?? '',
    inStockOnly: sp.get('in_stock') === '1',
  };
}

function pushState(s: ReturnType<typeof urlState>) {
  const sp = new URLSearchParams();
  if (s.q) sp.set('q', s.q);
  if (s.engine) sp.set('engine', s.engine);
  if (s.category) sp.set('category', s.category);
  if (s.brand) sp.set('brand', s.brand);
  if (s.size) sp.set('size', s.size);
  if (s.inStockOnly) sp.set('in_stock', '1');
  const url = sp.toString() ? `/search/?${sp.toString()}` : '/search/';
  window.history.replaceState({}, '', url);
}

const PAGE = 24;

export default function SearchPage() {
  const [products, setProducts] = useState<SearchProduct[] | null>(null);
  const [state, setState] = useState(() => (typeof window === 'undefined'
    ? { q: '', engine: '', category: '', brand: '', size: '', inStockOnly: false }
    : urlState()));
  const [page, setPage] = useState(0);

  useEffect(() => { loadSearchIndex().then((idx) => setProducts(idx.products)); }, []);
  useEffect(() => { pushState(state); setPage(0); }, [state]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return filterProducts(products, state);
  }, [products, state]);

  const facets = useMemo(() => {
    if (!products) return { engines: [], categories: [], brands: [], sizes: [] };
    const base = filterProducts(products, { ...state, engine: '', brand: '', size: '' });
    const scalarCounts = (key: 'engine_code' | 'category_code') => {
      const m = new Map<string, number>();
      for (const p of base) {
        const v = String(p[key] ?? '');
        if (!v) continue;
        m.set(v, (m.get(v) ?? 0) + 1);
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const arrayCounts = (key: 'brands' | 'sizes') => {
      const m = new Map<string, number>();
      for (const p of base) for (const v of p[key] ?? []) m.set(v, (m.get(v) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    return {
      engines: scalarCounts('engine_code'),
      categories: scalarCounts('category_code'),
      brands: arrayCounts('brands'),
      sizes: arrayCounts('sizes'),
    };
  }, [products, state]);

  const visible = filtered.slice(0, (page + 1) * PAGE);
  const set = (patch: Partial<typeof state>) => setState((s) => ({ ...s, ...patch }));

  return (
    <div className="searchpg">
      <div className="searchpg-bar">
        <input
          type="search"
          className="searchpg-q"
          value={state.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="OEM, артикул, двигатель, авто…"
          autoFocus
        />
        <label className="searchpg-toggle">
          <input type="checkbox" checked={state.inStockOnly} onChange={(e) => set({ inStockOnly: e.target.checked })} />
          <span>Только в наличии</span>
        </label>
      </div>

      <div className="searchpg-layout">
        <aside className="searchpg-filters">
          <FilterGroup
            title="Категория"
            options={facets.categories.map(([v, n]) => [v, `${CATEGORY_LABEL[v] ?? v} · ${n}`])}
            value={state.category}
            onChange={(v) => set({ category: v })}
          />
          <FilterGroup
            title="Двигатель"
            options={facets.engines.map(([v, n]) => [v, `${v} · ${n}`])}
            value={state.engine}
            onChange={(v) => set({ engine: v })}
            searchable
          />
          <FilterGroup
            title="Бренд"
            options={facets.brands.map(([v, n]) => [v, `${v} · ${n}`])}
            value={state.brand}
            onChange={(v) => set({ brand: v })}
          />
          <FilterGroup
            title="Размер"
            options={facets.sizes.map(([v, n]) => [v, `${v} · ${n}`])}
            value={state.size}
            onChange={(v) => set({ size: v })}
          />
          {(state.q || state.engine || state.category || state.brand || state.size || state.inStockOnly) && (
            <button
              className="searchpg-reset"
              onClick={() => setState({ q: '', engine: '', category: '', brand: '', size: '', inStockOnly: false })}
            >Сбросить фильтры</button>
          )}
        </aside>

        <section className="searchpg-results">
          <div className="searchpg-count">
            {products === null ? 'Загрузка…' : `${filtered.length.toLocaleString('ru-RU')} карточек`}
          </div>
          <div className="searchpg-grid">
            {visible.map((p) => (
              <a key={`${p.engine_code}-${p.category_code}`} href={`/p/${p.slug}/`} className="pcard">
                <div className="pcard-img">
                  {p.image_url
                    ? <img src={p.image_url} alt="" loading="lazy" />
                    : <div className="pcard-img-fallback">{p.engine_code[0] ?? '?'}</div>}
                </div>
                <div className="pcard-body">
                  <div className="pcard-brand">
                    {p.category_label}{p.in_stock && <span className="pcard-dot">●</span>}
                  </div>
                  <h3 className="pcard-title">{p.title}</h3>
                  <div className="pcard-meta">
                    <span>{p.brand_count} брендов</span>
                    <span>{p.size_count} размеров</span>
                    <span>{p.variant_count} SKU</span>
                  </div>
                  {p.brands?.length > 0 && (
                    <div className="pcard-oem" title="Бренды">{p.brands.slice(0, 4).join(' · ')}</div>
                  )}
                  {p.price_from != null && (
                    <div className="pcard-price">от {Number(p.price_from).toLocaleString('ru-RU')} ₸</div>
                  )}
                </div>
              </a>
            ))}
          </div>
          {products && filtered.length === 0 && (
            <div className="searchpg-empty">
              Ничего не нашли. Попробуйте код двигателя или OEM-номер. Или <a href="https://wa.me/77015509377">напишите в WhatsApp</a>.
            </div>
          )}
          {visible.length < filtered.length && (
            <button className="searchpg-more" onClick={() => setPage((p) => p + 1)}>
              Показать ещё ({filtered.length - visible.length})
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

function FilterGroup({
  title, options, value, onChange, searchable,
}: {
  title: string;
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
  searchable?: boolean;
}) {
  const [q, setQ] = useState('');
  const filtered = q ? options.filter(([v]) => v.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <div className="fg">
      <div className="fg-title">{title}</div>
      {searchable && options.length > 10 && (
        <input className="fg-search" placeholder="Найти…" value={q} onChange={(e) => setQ(e.target.value)} />
      )}
      <div className="fg-options">
        {value && <button className="fg-clear" onClick={() => onChange('')}>× {value}</button>}
        {!value && filtered.slice(0, searchable ? 24 : 12).map(([v, label]) => (
          <button key={v} className="fg-opt" onClick={() => onChange(v)}>{label}</button>
        ))}
      </div>
    </div>
  );
}
