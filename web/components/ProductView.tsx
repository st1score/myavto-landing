'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CATEGORY_LABEL, type Product } from '@/lib/types';
import type { FullProduct } from '@/lib/productData';
import { Icon } from '@/components/Icon';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import { partsBrandLogo, fmtKzt, waLink, PHONE_HUMAN, CATEGORY_ICON } from '@/lib/ui';
import { useIsOwner } from '@/lib/useIsOwner';

function Copy({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      aria-label="Скопировать"
      onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1200); }}
    >
      <Icon name={done ? 'check' : 'copy'} size={15} />
    </button>
  );
}

export default function ProductView({ p }: { p: FullProduct }) {
  const [pickedVariant, setPickedVariant] = useState<string | null>(p.variants[0]?.id ?? null);
  const [activeImg, setActiveImg] = useState(0);
  const [zoom, setZoom] = useState(false);
  const isOwner = useIsOwner();

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoom(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  const pv = p.variants.find((v) => v.id === pickedVariant) ?? p.variants[0];
  const own = p.listings.find((l) => l.variant_id === pv?.id && l.channel_code === 'OWN');
  const compare = own?.compare_at_price ?? null;
  const totalQty = p.stock.filter((s) => s.variant_id === pv?.id).reduce((a, b) => a + b.qty, 0);
  const inStock = totalQty > 0;
  const logo = partsBrandLogo(p.brand_code);
  const waText = `Здравствуйте! Интересует «${p.title}»${pv ? ` (SKU ${pv.sku})` : ''}. Есть в наличии?`;
  const img = p.images[activeImg];
  const save = own?.price != null && compare != null && compare > Number(own.price)
    ? Math.round((1 - Number(own.price) / compare) * 100) : 0;

  return (
    <div className="container">
      <div className="pdp">
        <div className="crumbs">
          <Link href="/">Главная</Link> <Icon name="chevR" size={14} />
          <Link href="/search">Каталог</Link> <Icon name="chevR" size={14} />
          <Link href={`/search?category=${p.category_code}`}>{CATEGORY_LABEL[p.category_code] ?? p.category_code}</Link> <Icon name="chevR" size={14} />
          <span>{isOwner ? p.master_sku : p.title}</span>
        </div>

        <div className="pdp__grid">
          {/* GALLERY */}
          <div className="gallery">
            <div className="gallery__main">
              <div className="gallery__badge">
                <span className={'stock' + (inStock ? '' : ' stock--out')}><span className="led" />{inStock ? (isOwner ? `В наличии · ${totalQty} шт` : 'В наличии') : 'Под заказ'}</span>
              </div>
              {img
                ? <img className="gimg" src={img} alt={p.title} onClick={() => setZoom(true)} style={{ cursor: 'zoom-in' }} />
                : <span className="gallery__ph">{p.brand_code[0]}</span>}
              {img && <button className="gallery__zoom" onClick={() => setZoom(true)} aria-label="Открыть на весь экран"><Icon name="search" size={18} /></button>}
            </div>
            {p.images.length > 1 && (
              <div className="gallery__thumbs">
                {p.images.map((u, i) => (
                  <button key={u} className={'thumb' + (i === activeImg ? ' is-active' : '')} onClick={() => setActiveImg(i)}>
                    <img src={u} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INFO */}
          <div className="pinfo">
            <div className="pinfo__brandrow">
              <span className="pill pill--brand">{p.brand_code}</span>
              {logo && <><span className="pinfo__divider" /><span className="pinfo__brandlogo"><img src={logo} alt={p.brand_code} /></span></>}
            </div>
            <span className={'stock' + (inStock ? '' : ' stock--out')}><span className="led" />{inStock ? (isOwner ? `В наличии · ${totalQty} шт на складе в Алматы` : 'В наличии на складе в Алматы') : 'Под заказ'}</span>
            <h1>{p.title}</h1>
            {isOwner && <div className="pinfo__sku">Артикул <b className="mono">{p.master_sku}</b><Copy value={p.master_sku} /></div>}

            {p.variants.length > 1 && (
              <div className="variants">
                <div className="variants__label">Вариант</div>
                <div className="variants__row">
                  {p.variants.map((v) => {
                    const vStock = p.stock.filter((s) => s.variant_id === v.id).reduce((a, b) => a + b.qty, 0) > 0;
                    return (
                      <button key={v.id} className={'vchip' + (v.id === pv?.id ? ' is-on' : '')} onClick={() => setPickedVariant(v.id)}>
                        <span className="mono">{v.variant_attrs?.size ?? v.sku}</span>
                        {v.variant_attrs?.insert && <span style={{ fontSize: 12 }}>{v.variant_attrs.insert}</span>}
                        {vStock && <span className="dot" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="priceblock">
              <div className="priceblock__row">
                {own?.price != null
                  ? <span className="now">{fmtKzt(Number(own.price))}</span>
                  : <span className="now" style={{ fontSize: 24 }}>Цена по запросу</span>}
                {compare != null && save > 0 && <span className="old">{fmtKzt(compare)}</span>}
                {save > 0 && <span className="save">−{save}%</span>}
              </div>
              {p.short_desc && <div className="priceblock__meta">{p.short_desc}</div>}
              <div className="cta-stack">
                <a className="btn btn--wa btn--block" href={waLink(waText)} target="_blank" rel="noopener"><Icon name="wa" size={20} /> Заказать в WhatsApp</a>
                <div className="row">
                  <a className="btn btn--ghost" href={`tel:${PHONE_HUMAN.replace(/[^+\d]/g, '')}`}><Icon name="phone" size={18} /> Позвонить</a>
                  <Link className="btn btn--ghost" href={`/search?category=${p.category_code}`}><Icon name="repeat" size={18} /> Аналоги</Link>
                </div>
                <div className="cta-note"><Icon name="check" size={15} /> Ответим за 5 минут · поможем с подбором</div>
              </div>
            </div>

            <div className="perks">
              <div className="perk"><Icon name="truck" size={20} /><div><b>Доставка по РК</b><small>Отправка в день заказа</small></div></div>
              <div className="perk"><Icon name="shield" size={20} /><div><b>Оригинал</b><small>Проверенные бренды</small></div></div>
              <div className="perk"><Icon name="wallet" size={20} /><div><b>Оплата Kaspi</b><small>Наличные · перевод</small></div></div>
              <div className="perk"><Icon name="box" size={20} /><div><b>Самовывоз</b><small>ТЦ CarCity, 135В</small></div></div>
            </div>
          </div>
        </div>

        {/* DETAILS */}
        <div className="pdetails">
          <div>
            {p.description && (
              <Reveal className="pblock">
                <h3><Icon name="file" size={19} /> Описание</h3>
                <p>{p.description}</p>
              </Reveal>
            )}
            {p.compatible_engines.length > 0 && (
              <Reveal className="pblock">
                <h3><Icon name="wrench" size={19} /> Совместимые двигатели</h3>
                <div className="engine-chips">
                  {p.compatible_engines.map((e) => (
                    <Link key={e} className="engine-chip" href={`/search?engine=${e}`}><Icon name="check" size={14} /><span className="mono">{e}</span></Link>
                  ))}
                </div>
              </Reveal>
            )}
            {p.oem_numbers.length > 0 && (
              <Reveal className="pblock">
                <h3><Icon name="layers" size={19} /> OEM-номера</h3>
                <div className="oem-list">
                  {p.oem_numbers.map((o) => (
                    <div key={o} className="oem"><span className="mono">{o}</span><Copy value={o} /></div>
                  ))}
                </div>
              </Reveal>
            )}
          </div>
          <div>
            {p.cross_numbers.length > 0 && (
              <Reveal className="pblock">
                <h3><Icon name="repeat" size={19} /> Кроссы / аналоги по номеру</h3>
                <div className="oem-list">
                  {p.cross_numbers.map((o) => (
                    <div key={o} className="oem"><span className="mono">{o}</span><Copy value={o} /></div>
                  ))}
                </div>
              </Reveal>
            )}
          </div>
        </div>

        {/* RELATED */}
        {p.related.length > 0 && (
          <section className="section" style={{ padding: '40px 0 0' }}>
            <Reveal className="sec-head">
              <div>
                <div className="sec-eyebrow">Тот же мотор</div>
                <h2 className="sec-title">Другие запчасти</h2>
              </div>
            </Reveal>
            <div className="grid-products">
              {p.related.map((r) => <ProductCard key={r.id} p={r as any} />)}
            </div>
          </section>
        )}
      </div>

      {zoom && img && (
        <div className="lightbox" onClick={() => setZoom(false)} role="dialog" aria-modal="true">
          <button className="lightbox__close" onClick={() => setZoom(false)} aria-label="Закрыть"><Icon name="x" size={26} /></button>
          <img className="lightbox__img" src={img} alt={p.title} onClick={(e) => e.stopPropagation()} />
          {p.images.length > 1 && (
            <div className="lightbox__thumbs" onClick={(e) => e.stopPropagation()}>
              {p.images.map((u, i) => (
                <button key={u} className={'thumb' + (i === activeImg ? ' is-active' : '')} onClick={() => setActiveImg(i)}>
                  <img src={u} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
