import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { categoryHubs, productsForCategory } from '@/lib/productData';
import { CATEGORY_LABEL } from '@/lib/types';
import { CATEGORY_SLUG, CATEGORY_BY_SLUG, productSlug } from '@/lib/slug';
import { SITE_URL } from '@/lib/seo';
import ProductCard from '@/components/ProductCard';

export const dynamicParams = false;

export async function generateStaticParams() {
  const hubs = await categoryHubs();
  return hubs
    .filter((h) => CATEGORY_SLUG[h.code])
    .map((h) => ({ category: CATEGORY_SLUG[h.code] }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const code = CATEGORY_BY_SLUG[category];
  if (!code) return { title: 'Категория не найдена — MY AVTO' };
  const products = await productsForCategory(code);
  if (products.length === 0) return { title: 'Категория не найдена — MY AVTO' };
  const label = CATEGORY_LABEL[code] ?? code;
  const engines = [...new Set(products.flatMap((p) => p.compatible_engines ?? []))].slice(0, 8).join(', ');
  const title = `${label} для японских двигателей — купить в Алматы`;
  const description = `${label} для двигателей ${engines}. ${products.length} позиций в наличии. Оригинал и проверенные бренды, доставка по Казахстану. MY AVTO, Алматы.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/zapchasti/${category}/` },
    openGraph: { title, description, url: `${SITE_URL}/zapchasti/${category}/`, type: 'website' },
  };
}

export default async function CategoryHubPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const code = CATEGORY_BY_SLUG[category];
  if (!code) notFound();
  const products = await productsForCategory(code);
  if (products.length === 0) notFound();

  const label = CATEGORY_LABEL[code] ?? code;
  const url = `${SITE_URL}/zapchasti/${category}/`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: label, item: url },
        ],
      },
      {
        '@type': 'ItemList',
        name: label,
        numberOfItems: products.length,
        itemListElement: products.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/p/${productSlug(p)}/`,
          name: p.title,
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container" style={{ padding: '28px 24px 64px' }}>
        <nav className="crumbs" style={{ fontSize: 14, marginBottom: 14 }}>
          <Link href="/">Главная</Link> <span>/</span> <span>{label}</span>
        </nav>
        <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>{label} для японских двигателей</h1>
        <p style={{ color: 'var(--c-muted)', margin: '0 0 24px' }}>
          {products.length} позиций · Алматы, доставка по Казахстану
        </p>
        <div className="grid pgrid">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>
    </>
  );
}
