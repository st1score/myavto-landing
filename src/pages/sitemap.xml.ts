import { getCollection } from 'astro:content';
import { getListings } from '../lib/listings';
import { SITE } from '../data/site';

export async function GET() {
  const marki = await getCollection('marki');
  const cats = await getCollection('zapchasti');
  const listings = (await getListings()).filter((l) => l.data.status === 'v-prodazhe');
  const today = new Date().toISOString().slice(0, 10);
  const urls: { loc: string; lastmod?: string }[] = [
    { loc: '/' },
    ...marki.map((m) => ({ loc: `/${m.id}/` })),
    ...cats.map((c) => ({ loc: `/zapchasti/${c.id}/` })),
    { loc: '/brendy/' },
    { loc: '/kontakty/' },
    ...(listings.length ? [{ loc: '/prodazha/' }] : []),
    ...listings.map((l) => ({ loc: `/prodazha/${l.id}/`, lastmod: l.data.date.toISOString().slice(0, 10) })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE.url}${u.loc}</loc><lastmod>${u.lastmod ?? today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
