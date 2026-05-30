'use client';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { partsBrandLogo, fmtKzt, waLink, CATEGORY_ICON } from '@/lib/ui';
import { productSlug } from '@/lib/slug';
import { useIsOwner } from '@/lib/useIsOwner';
import type { CatalogRow } from '@/lib/types';

function WhatsAppGlyph({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.004c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.02zm-7.01 15.24h-.004a8.22 8.22 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 5.83 2.42 8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
    </svg>
  );
}

export default function ProductCard({ p }: { p: CatalogRow }) {
  const isOwner = useIsOwner();
  const inStock = p.total_stock > 0;
  const logo = partsBrandLogo(p.brand_code);
  const partIcon = CATEGORY_ICON[p.category_code] ?? 'piston';
  const wa = waLink(`Здравствуйте! Интересует «${p.title}» (${p.master_sku}). Есть в наличии?`);
  const href = `/p/${productSlug(p)}/`;

  return (
    <article className="pcard">
      <Link href={href} className="pcard__media" aria-label={p.title}>
        {p.image_url
          ? <img className="pimg" src={p.image_url} alt={p.title} loading="lazy" />
          : <span className="part"><Icon name={partIcon} size={80} /></span>}
      </Link>
      <div className="pcard__body">
        <div className="pcard__tags">
          {inStock
            ? <span className="stock"><span className="led" />В наличии</span>
            : <span className="stock stock--out"><span className="led" />Под заказ</span>}
          {logo && <span className="pcard__brandlogo"><img src={logo} alt={p.brand_code} loading="lazy" /></span>}
        </div>
        <Link href={href} className="pcard__name">{p.title}</Link>
        {isOwner && <div className="pcard__sku">Артикул <b className="mono">{p.master_sku}</b></div>}
        <div className="pcard__foot">
          <div className="pcard__price">
            {p.price_own != null
              ? <span className="now">{fmtKzt(Number(p.price_own))}</span>
              : <span className="muted">Цена по запросу</span>}
          </div>
          <a className="pcard__cta" href={wa} target="_blank" rel="noopener" aria-label="Заказать через WhatsApp" onClick={(e) => e.stopPropagation()}>
            <WhatsAppGlyph size={22} />
          </a>
        </div>
      </div>
    </article>
  );
}
