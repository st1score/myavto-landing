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

const CATS = ['PISTON', 'RING', 'BEARING', 'LINER', 'KIT'];
const HINTS = ['1KZ-TE', '2JZ-GE', '4D56', 'TD27', 'поршневая группа'];

export default function Home() {
  const router = useRouter();
  const [recent, setRecent] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setLoaded(true)));
    supabaseBrowser()
      .from('v_catalog').select('*').eq('status', 'active')
      .order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => { setRecent((data ?? []) as CatalogRow[]); setLoading(false); });
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className={'hero' + (loaded ? ' is-loaded' : '')}>
        <div className="hero__bg" /><div className="hero__glow" />
        <div className="hero__inner">
          <span className="hero__eyebrow hero-anim" style={{ transitionDelay: '0ms' }}>
            <span className="led" />Капитальный ремонт двигателя · Алматы
          </span>
          <h1 className="hero-anim" style={{ transitionDelay: '80ms' }}>
            Запчасти для капремонта <em>японских двигателей</em>
          </h1>
          <div className="hero__brands hero-anim" style={{ transitionDelay: '160ms' }}>
            <b>Toyota</b> · <b>Nissan</b> · <b>Honda</b> · <b>Mazda</b> · <b>Mitsubishi</b> · <b>Subaru</b> · <b>Suzuki</b>
          </div>
          <form
            className="search hero-anim" style={{ transitionDelay: '240ms' }}
            onSubmit={(e) => { e.preventDefault(); const q = String(new FormData(e.currentTarget).get('q') ?? '').trim(); router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search'); }}
          >
            <Link className="search__cat" href="/search"><Icon name="grid" size={16} /> Все категории <Icon name="chevD" size={16} /></Link>
            <div className="search__field">
              <Icon name="search" size={22} />
              <input name="q" type="text" placeholder="Артикул, двигатель или запчасть — напр. 1KZ-TE" />
            </div>
            <button className="search__btn" type="submit"><Icon name="search" size={19} /> Найти</button>
          </form>
          <div className="search__hints hero-anim" style={{ transitionDelay: '320ms' }}>
            <span>Популярное:</span>
            {HINTS.map((h) => (
              <Link key={h} className="chip" href={`/search?q=${encodeURIComponent(h)}`}><span className="mono">{h}</span></Link>
            ))}
          </div>
          <div className="trust hero-anim" style={{ transitionDelay: '400ms' }}>
            <div><Icon name="check" size={18} /> В наличии на складе в Алматы</div>
            <div><Icon name="check" size={18} /> Отправка по всему Казахстану</div>
            <div><Icon name="check" size={18} /> Подбор по двигателю и авто</div>
          </div>
        </div>
      </section>

      {/* MAKES MARQUEE */}
      <Reveal className="marquee-wrap">
        <div className="marquee-head">
          <span className="label">Подбор по марке</span>
          <h3>Запчасти для японских и корейских марок</h3>
          <span className="rule" />
        </div>
        <Marquee items={MAKE_ITEMS} dur="40s" variant="makes" />
      </Reveal>

      {/* CATEGORIES */}
      <section className="section">
        <div className="container">
          <Reveal className="sec-head">
            <div>
              <div className="sec-eyebrow">Категории</div>
              <h2 className="sec-title">Что мы поставляем</h2>
            </div>
            <Link className="sec-link" href="/search">Весь каталог <Icon name="arrowR" size={16} /></Link>
          </Reveal>
          <Reveal variant="stagger" step={60} className="cats">
            {CATS.map((code) => (
              <Link key={code} className="cat" href={`/search?category=${code}`}>
                <span className="cat__go"><Icon name="arrowR" size={16} /></span>
                <span className="cat__ico"><Icon name={CATEGORY_ICON[code] ?? 'piston'} size={32} stroke={1.8} /></span>
                <div className="cat__name">{CATEGORY_LABEL[code] ?? code}</div>
                <div className="cat__count">Перейти в каталог</div>
              </Link>
            ))}
          </Reveal>
        </div>
      </section>

      {/* PARTS BRANDS MARQUEE */}
      <section className="section section--soft">
        <div className="marquee-wrap" style={{ paddingTop: 0 }}>
          <div className="marquee-head">
            <span className="label">Только оригинал</span>
            <h3>Бренды запчастей, с которыми работаем</h3>
            <span className="rule" />
          </div>
          <Reveal>
            <Marquee items={PARTS_BRAND_ITEMS} dur="34s" reverse variant="brands" />
          </Reveal>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="section">
        <div className="container">
          <Reveal className="sec-head">
            <div>
              <div className="sec-eyebrow">Свежий завоз</div>
              <h2 className="sec-title">Новые поступления</h2>
            </div>
            <Link className="sec-link" href="/search">Смотреть все <Icon name="arrowR" size={16} /></Link>
          </Reveal>
          {!loading && recent.length === 0 && (
            <div className="empty">Пока пусто. Добавь товар в <Link href="/dashboard" style={{ color: 'var(--c-red)', fontWeight: 600 }}>кабинете</Link>.</div>
          )}
          <div className="grid-products">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
              : recent.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </div>
      </section>
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
