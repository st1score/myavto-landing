import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { engineHubs, productsForEngine } from '@/lib/productData';
import { CATEGORY_LABEL } from '@/lib/types';
import { SITE_URL } from '@/lib/seo';
import { productSlug } from '@/lib/slug';
import ProductCard from '@/components/ProductCard';

export const dynamicParams = false;

export async function generateStaticParams() {
  const hubs = await engineHubs();
  return hubs.map((h) => ({ engine: h.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ engine: string }> }): Promise<Metadata> {
  const { engine } = await params;
  const hub = await productsForEngine(engine);
  if (!hub) return { title: 'Двигатель не найден — MY AVTO' };
  const cats = [...new Set(hub.products.map((p) => CATEGORY_LABEL[p.category_code] ?? p.category_code))].join(', ');
  const title = `Запчасти для двигателя ${hub.code} — купить в Алматы`;
  const description = `${cats} для двигателя ${hub.code}. ${hub.products.length} позиций в наличии. Оригинал и проверенные бренды, доставка по Казахстану. Заказ через WhatsApp. MY AVTO, Алматы.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/dvigateli/${engine}/` },
    openGraph: { title, description, url: `${SITE_URL}/dvigateli/${engine}/`, type: 'website' },
  };
}

export default async function EngineHubPage({ params }: { params: Promise<{ engine: string }> }) {
  const { engine } = await params;
  const hub = await productsForEngine(engine);
  if (!hub) notFound();

  const url = `${SITE_URL}/dvigateli/${engine}/`;
  const cats = [...new Set(hub.products.map((p) => CATEGORY_LABEL[p.category_code] ?? p.category_code))];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: `Двигатель ${hub.code}`, item: url },
        ],
      },
      {
        '@type': 'ItemList',
        name: `Запчасти для двигателя ${hub.code}`,
        numberOfItems: hub.products.length,
        itemListElement: hub.products.map((p, i) => ({
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
          <Link href="/">Главная</Link> <span>/</span> <span>Двигатель {hub.code}</span>
        </nav>
        <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>Запчасти для двигателя {hub.code}</h1>
        <p style={{ color: 'var(--c-muted)', margin: '0 0 24px' }}>
          {cats.join(' · ')} · {hub.products.length} позиций · Алматы, доставка по Казахстану
        </p>
        <div className="grid pgrid">
          {hub.products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>
    </>
  );
}
