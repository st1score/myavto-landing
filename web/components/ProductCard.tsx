'use client';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { partsBrandLogo, fmtKzt, waLink, CATEGORY_ICON } from '@/lib/ui';
import { useIsOwner } from '@/lib/useIsOwner';
import type { CatalogRow } from '@/lib/types';

export default function ProductCard({ p }: { p: CatalogRow }) {
  const isOwner = useIsOwner();
  const inStock = p.total_stock > 0;
  const logo = partsBrandLogo(p.brand_code);
  const partIcon = CATEGORY_ICON[p.category_code] ?? 'piston';
  const wa = waLink(`Здравствуйте! Интересует «${p.title}» (${p.master_sku}). Есть в наличии?`);

  return (
    <article className="pcard">
      <Link href={`/p?id=${p.id}`} className="pcard__media" aria-label={p.title}>
        {p.image_url
          ? <img className="pimg" src={p.image_url} alt={p.title} loading="lazy" />
          : <span className="part"><Icon name={partIcon} size={80} /></span>}
        <span className="pcard__stock">
          {inStock
            ? <span className="stock"><span className="led" />В наличии</span>
            : <span className="stock stock--out"><span className="led" />Под заказ</span>}
        </span>
        {logo && <span className="pcard__brandlogo"><img src={logo} alt={p.brand_code} loading="lazy" /></span>}
      </Link>
      <div className="pcard__body">
        <Link href={`/p?id=${p.id}`} className="pcard__name">{p.title}</Link>
        {isOwner && <div className="pcard__sku">Артикул <b className="mono">{p.master_sku}</b></div>}
        <div className="pcard__foot">
          <div className="pcard__price">
            {p.price_own != null
              ? <span className="now">{fmtKzt(Number(p.price_own))}</span>
              : <span className="muted">Цена по запросу</span>}
          </div>
          <a className="pcard__cta" href={wa} target="_blank" rel="noopener" aria-label="Заказать через WhatsApp" onClick={(e) => e.stopPropagation()}>
            <Icon name="wa" size={21} />
          </a>
        </div>
      </div>
    </article>
  );
}
