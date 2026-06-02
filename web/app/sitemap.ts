import type { MetadataRoute } from 'next';
import { allProductSlugs, engineHubs } from '@/lib/productData';

const SITE = 'https://my-avto.kz';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, engines] = await Promise.all([allProductSlugs(), engineHubs()]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/search/`, changeFrequency: 'daily', priority: 0.8 },
  ];

  // Engine hubs — landing pages that capture long-tail "<part> <engine>" queries.
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

  return [...staticPages, ...enginePages, ...productPages];
}
