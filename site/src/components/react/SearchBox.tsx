import { useEffect, useRef, useState } from 'react';
import { loadSearchIndex, filterProducts, type SearchProduct } from '../../lib/search-client';

type Props = {
  size?: 'lg' | 'md';
  placeholder?: string;
  autoFocus?: boolean;
};

export default function SearchBox({ size = 'lg', placeholder = 'OEM, артикул, двигатель, авто…', autoFocus }: Props) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [total, setTotal] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadSearchIndex(); }, []);

  useEffect(() => {
    let alive = true;
    const handle = setTimeout(async () => {
      if (!q.trim()) { setHits([]); setTotal(0); setOpen(false); return; }
      const idx = await loadSearchIndex();
      if (!alive) return;
      const all = filterProducts(idx.products, { q });
      setHits(all.slice(0, 8));
      setTotal(all.length);
      setOpen(true);
      setActive(0);
    }, 90);
    return () => { alive = false; clearTimeout(handle); };
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(target?: string) {
    window.location.href = target ?? `/search/?q=${encodeURIComponent(q)}`;
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || hits.length === 0) { if (e.key === 'Enter') go(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const h = hits[active];
      if (h) go(`/p/${h.slug}/`);
      else go();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`sb sb-${size}`}>
      <div className="sb-input-wrap">
        <svg className="sb-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => q && setOpen(true)}
          placeholder={placeholder}
          aria-label="Поиск запчастей"
          autoFocus={autoFocus}
          autoComplete="off"
        />
        <button className="sb-go" onClick={() => go()} aria-label="Искать">Найти</button>
      </div>
      {open && hits.length > 0 && (
        <div className="sb-dropdown" role="listbox">
          {hits.map((h, i) => (
            <a
              key={`${h.engine_code}-${h.category_code}`}
              href={`/p/${h.slug}/`}
              className={'sb-hit' + (i === active ? ' active' : '')}
              onMouseEnter={() => setActive(i)}
              role="option"
              aria-selected={i === active}
            >
              {h.image_url && <img src={h.image_url} alt="" loading="lazy" />}
              <div className="sb-hit-body">
                <div className="sb-hit-title">{h.title}</div>
                <div className="sb-hit-meta">
                  <span>{h.brand_count} брендов</span>
                  <span>·</span>
                  <span>{h.size_count} размеров</span>
                  {h.in_stock && <span className="sb-dot" aria-label="в наличии">●</span>}
                </div>
              </div>
              {h.price_from != null && (
                <div className="sb-hit-price">от {Number(h.price_from).toLocaleString('ru-RU')} ₸</div>
              )}
            </a>
          ))}
          {total > hits.length && (
            <button className="sb-more" onClick={() => go()}>
              Показать ещё {total - hits.length}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
