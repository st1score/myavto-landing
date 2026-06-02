import type { MetadataRoute } from 'next';
import { allProductSlugs, engineHubs, categoryHubs } from '@/lib/productData';
import { CATEGORY_SLUG } from '@/lib/slug';

const SITE = 'https://my-avto.kz';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, engines, categories] = await Promise.all([
    allProductSlugs(),
    engineHubs(),
    categoryHubs(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/search/`, changeFrequency: 'daily', priority: 0.8 },
  ];

  // Category + engine hubs — landing pages that capture broad/long-tail queries.
  const categoryPages: MetadataRoute.Sitemap = categories
    .filter((c) => CATEGORY_SLUG[c.code])
    .map((c) => ({ url: `${SITE}/zapchasti/${CATEGORY_SLUG[c.code]}/`, changeFrequency: 'daily', priority: 0.8 }));

  const enginePages: MetadataRoute.Sitemap = engines.map((e) => ({
    url: `${SITE}/dvigateli/${e.slug}/`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE}/p/${p.slug}/`,
    lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...enginePages, ...productPages];
}
