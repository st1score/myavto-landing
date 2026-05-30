import type { MetadataRoute } from 'next';
import { allProductSlugs } from '@/lib/productData';

const SITE = 'https://my-avto.kz';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await allProductSlugs();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/search/`, changeFrequency: 'daily', priority: 0.8 },
  ];

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE}/p/${p.slug}/`,
    lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...productPages];
}
