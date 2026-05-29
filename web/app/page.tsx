'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { CATEGORY_LABEL, type CatalogRow } from '@/lib/types';
import { Icon } from '@/components/Icon';
import Marquee from '@/components/Marquee';
import Reveal from '@/components/Reveal';
import ProductCard from '@/components/ProductCard';
import { MAKE_ITEMS, PARTS_BRAND_ITEMS, CATEGORY_ICON } from '@/lib/ui';
import { DEFAULT_HOME, loadHomeDoc, type Block, type HeroProps, type HeadProps, type BannerProps } from '@/lib/homeContent';

const CATS = ['PISTON', 'RING', 'BEARING', 'LINER', 'KIT'];

export default function Home() {
  const router = useRouter();
  const [recent, setRecent] = useState<CatalogRow[]>([]);
  const [catImg, setCatImg] = useState<Record<string, string>>({});
  const [blocks, setBlocks] = useState<Block[]>(DEFAULT_HOME.blocks);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setLoaded(true)));
    loadHomeDoc().then((d) => setBlocks(d.blocks.filter((b) => b.visible)));
    const s = supabaseBrowser();
    s.from('v_catalog').select('*').eq('status', 'active')
      .order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => { setRecent((data ?? []) as CatalogRow[]); setLoading(false); });
    s.from('v_catalog').select('category_code, image_url').eq('status', 'active')
      .not('image_url', 'is', null).limit(300)
      .then(({ data }) => {
        const m: Record<string, string> = {};
        for (const r of (data ?? []) as { category_code: string; image_url: string }[]) {
          if (!m[r.category_code]) m[r.category_code] = r.image_url;
        }
        setCatImg(m);
      });
  }, []);

  function renderHero(p: HeroProps) {
    return (
      <section key="hero" className={'hero' + (loaded ? ' is-loaded' : '')}>
        <div className="hero__bg" /><div className="hero__glow" />
        <div className="hero__inner">
          <span className="hero__eyebrow hero-anim" style={{ transitionDelay: '0ms' }}>
            <span className="led" />{p.eyebrow}
          </span>
          <h1 className="hero-anim" style={{ transitionDelay: '80ms' }}>
            {p.titlePre}<em>{p.titleEm}</em>{p.titlePost}
          </h1>
          {p.brands.length > 0 && (
            <div className="hero__brands hero-anim" style={{ transitionDelay: '160ms' }}>
              {p.brands.map((b, i) => <span key={b}>{i > 0 && ' · '}<b>{b}</b></span>)}
            </div>
          )}
          <form
            className="search hero-anim" style={{ transitionDelay: '240ms' }}
            onSubmit={(e) => { e.preventDefault(); const q = String(new FormData(e.currentTarget).get('q') ?? '').trim(); router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search'); }}
          >
            <Link className="search__cat" href="/search"><Icon name="grid" size={16} /> Все категории <Icon name="chevD" size={16} /></Link>
            <div className="search__field">
              <Icon name="search" size={22} />
              <input name="q" type="text" placeholder={p.searchPlaceholder} />
            </div>
            <button className="search__btn" type="submit"><Icon name="search" size={19} /> Найти</button>
          </form>
          {p.hints.length > 0 && (
            <div className="search__hints hero-anim" style={{ transitionDelay: '320ms' }}>
              <span>Популярное:</span>
              {p.hints.map((h) => (
                <Link key={h} className="chip" href={`/search?q=${encodeURIComponent(h)}`}><span className="mono">{h}</span></Link>
              ))}
            </div>
          )}
          {p.trust.length > 0 && (
            <div className="trust hero-anim" style={{ transitionDelay: '400ms' }}>
              {p.trust.map((t) => <div key={t}><Icon name="check" size={18} /> {t}</div>)}
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderArrivals(p: HeadProps, key: string) {
    return (
      <section key={key} className="section">
        <div className="container">
          <Reveal className="sec-head">
            <div>
              <div className="sec-eyebrow">{p.eyebrow}</div>
              <h2 className="sec-title">{p.title}</h2>
            </div>
            <Link className="sec-link" href="/search">Смотреть все <Icon name="arrowR" size={16} /></Link>
          </Reveal>
          {!loading && recent.length === 0 && (
            <div className="empty">Пока пусто. Добавь товар в <Link href="/dashboard" style={{ color: 'var(--c-red)', fontWeight: 600 }}>кабинете</Link>.</div>
          )}
          <div className="grid-products">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
              : recent.map((pr) => <ProductCard key={pr.id} p={pr} />)}
          </div>
        </div>
      </section>
    );
  }

  function renderCategories(p: HeadProps, key: string) {
    return (
      <section key={key} className="section section--soft">
        <div className="container">
          <Reveal className="sec-head">
            <div>
              <div className="sec-eyebrow">{p.eyebrow}</div>
              <h2 className="sec-title">{p.title}</h2>
            </div>
            <Link className="sec-link" href="/search">Весь каталог <Icon name="arrowR" size={16} /></Link>
          </Reveal>
          <Reveal variant="stagger" step={60} className="cats">
            {CATS.map((code) => (
              <Link key={code} className={'cat' + (catImg[code] ? ' cat--photo' : '')} href={`/search?category=${code}`}>
                <span className="cat__go"><Icon name="arrowR" size={16} /></span>
                {catImg[code]
                  ? <span className="cat__photo"><img src={catImg[code]} alt={CATEGORY_LABEL[code] ?? code} loading="lazy" /></span>
                  : <span className="cat__ico"><Icon name={CATEGORY_ICON[code] ?? 'piston'} size={32} stroke={1.8} /></span>}
                <div className="cat__name">{CATEGORY_LABEL[code] ?? code}</div>
                <div className="cat__count">Перейти в каталог</div>
              </Link>
            ))}
          </Reveal>
        </div>
      </section>
    );
  }

  function renderMakes(p: HeadProps, key: string) {
    return (
      <Reveal key={key} className="marquee-wrap">
        <div className="marquee-head">
          <span className="label">{p.eyebrow}</span>
          <h3>{p.title}</h3>
          <span className="rule" />
        </div>
        <Marquee items={MAKE_ITEMS} dur="40s" variant="makes" />
      </Reveal>
    );
  }

  function renderParts(p: HeadProps, key: string) {
    return (
      <section key={key} className="section section--soft">
        <div className="marquee-wrap" style={{ paddingTop: 0 }}>
          <div className="marquee-head">
            <span className="label">{p.eyebrow}</span>
            <h3>{p.title}</h3>
            <span className="rule" />
          </div>
          <Reveal>
            <Marquee items={PARTS_BRAND_ITEMS} dur="34s" reverse variant="brands" />
          </Reveal>
        </div>
      </section>
    );
  }

  function renderBanner(p: BannerProps, key: string) {
    return (
      <section key={key} className="section">
        <div className="container">
          <Reveal className={'home-banner' + (p.imageUrl ? '' : ' home-banner--plain')}>
            {p.imageUrl && <div className="home-banner__media"><img src={p.imageUrl} alt={p.title} /></div>}
            <div className="home-banner__body">
              {p.eyebrow && <div className="sec-eyebrow">{p.eyebrow}</div>}
              {p.title && <h2 className="sec-title">{p.title}</h2>}
              {p.text && <p className="home-banner__text">{p.text}</p>}
              {p.ctaLabel && <Link className="btn btn--wa" href={p.ctaHref || '/search'}>{p.ctaLabel} <Icon name="arrowR" size={16} /></Link>}
            </div>
          </Reveal>
        </div>
      </section>
    );
  }

  return (
    <div>
      {blocks.map((b) => {
        if (b.type === 'hero') return renderHero(b.props);
        if (b.type === 'arrivals') return renderArrivals(b.props, b.id);
        if (b.type === 'categories') return renderCategories(b.props, b.id);
        if (b.type === 'makes') return renderMakes(b.props, b.id);
        if (b.type === 'parts') return renderParts(b.props, b.id);
        if (b.type === 'banner') return renderBanner(b.props, b.id);
        return null;
      })}
    </div>
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
