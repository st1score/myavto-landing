import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { allProductSlugs, fetchFullProductBySlug } from '@/lib/productData';
import { CATEGORY_LABEL } from '@/lib/types';
import ProductView from '@/components/ProductView';

export const dynamicParams = false; // only pre-built slugs exist; others → 404

const SITE = 'https://my-avto.kz';

export async function generateStaticParams() {
  const slugs = await allProductSlugs();
  return slugs.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await fetchFullProductBySlug(slug);
  if (!p) return { title: 'Товар не найден — MY AVTO' };

  const catRu = CATEGORY_LABEL[p.category_code] ?? p.category_code;
  const engines = p.compatible_engines.join(', ');
  const title = p.seo_title ?? `${p.title} — купить в Алматы | MY AVTO`;
  const description = p.seo_desc
    ?? p.short_desc
    ?? `${p.title}. ${catRu}${engines ? ` для двигателей ${engines}` : ''}. Доставка по Казахстану, заказ через WhatsApp. MY AVTO, Алматы.`;
  const url = `${SITE}/p/${slug}/`;
  const image = p.images[0];

  return {
    title,
    description,
    keywords: p.seo_keywords ?? [p.title, catRu, p.brand_code, ...p.compatible_engines, 'Алматы', 'купить'],
    alternates: { canonical: url },
    openGraph: {
      type: 'website', url, title, description, siteName: 'MY AVTO',
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await fetchFullProductBySlug(slug);
  if (!p) notFound();

  const catRu = CATEGORY_LABEL[p.category_code] ?? p.category_code;
  const own = p.listings.find((l) => l.channel_code === 'OWN');
  const inStock = p.stock.reduce((a, b) => a + b.qty, 0) > 0;

  // Product structured data → eligible for Google rich results.
  // Offer price valid ~1 year out; static export rebuilds (cron 6h / on change)
  // keep this date rolling forward. Required by Google for clean rich results.
  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const productLd = {
    '@type': 'Product',
    name: p.title,
    description: p.short_desc ?? p.description ?? p.title,
    sku: p.master_sku,
    ...(p.manufacturer_part_number ? { mpn: p.manufacturer_part_number } : {}),
    category: catRu,
    brand: { '@type': 'Brand', name: p.brand_code },
    ...(p.images.length > 0 ? { image: p.images } : {}),
    ...(p.compatible_engines.length > 0 ? { isAccessoryOrSparePartFor: p.compatible_engines.join(', ') } : {}),
    offers: {
      '@type': 'Offer',
      url: `${SITE}/p/${slug}/`,
      priceCurrency: 'KZT',
      ...(own?.price != null ? { price: String(own.price), priceValidUntil } : {}),
      itemCondition: 'https://schema.org/NewCondition',
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
      seller: { '@id': `${SITE}/#business` },
    },
  };

  const breadcrumbLd = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: catRu, item: `${SITE}/search/?category=${p.category_code}` },
      { '@type': 'ListItem', position: 3, name: p.title, item: `${SITE}/p/${slug}/` },
    ],
  };

  const jsonLd = { '@context': 'https://schema.org', '@graph': [productLd, breadcrumbLd] };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductView p={p} />
    </>
  );
}
