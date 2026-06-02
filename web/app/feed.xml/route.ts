// Google Merchant Center product feed (RSS 2.0 + g: namespace).
// Powers FREE Shopping listings — no ad spend required. Emitted as a static
// /feed.xml at build time; the catalog rebuild (cron 6h / repository_dispatch)
// keeps it fresh. Submit the URL in Merchant Center → Products → Feeds.

import { supabaseServer } from '@/lib/supabase/server';
import { productSlug } from '@/lib/slug';
import { SITE_URL, SITE_NAME } from '@/lib/seo';
import { CATEGORY_LABEL } from '@/lib/types';

export const dynamic = 'force-static';

type FeedRow = {
  id: string;
  master_sku: string;
  title: string;
  short_desc: string | null;
  category_code: string;
  brand_code: string;
  compatible_engines: string[];
  image_url: string | null;
  price_own: number | null;
  total_stock: number;
};

function xml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!),
  );
}

export async function GET(): Promise<Response> {
  const { data } = await supabaseServer()
    .from('v_catalog')
    .select('id, master_sku, title, short_desc, category_code, brand_code, compatible_engines, image_url, price_own, total_stock')
    .eq('status', 'active');

  const rows = (data ?? []) as FeedRow[];

  // Merchant requires image + price. Skip items missing either (would be rejected).
  const items = rows
    .filter((r) => r.image_url && r.price_own != null)
    .map((r) => {
      const slug = productSlug(r);
      const catRu = CATEGORY_LABEL[r.category_code] ?? r.category_code;
      const engines = r.compatible_engines?.length ? ` для двигателей ${r.compatible_engines.join(', ')}` : '';
      const desc = r.short_desc ?? `${r.title}. ${catRu}${engines}. Доставка по Казахстану.`;
      const availability = r.total_stock > 0 ? 'in_stock' : 'preorder';
      return [
        '<item>',
        `<g:id>${xml(r.master_sku)}</g:id>`,
        `<title>${xml(r.title)}</title>`,
        `<description>${xml(desc)}</description>`,
        `<link>${SITE_URL}/p/${xml(slug)}/</link>`,
        `<g:image_link>${xml(r.image_url!)}</g:image_link>`,
        `<g:availability>${availability}</g:availability>`,
        `<g:price>${r.price_own} KZT</g:price>`,
        `<g:brand>${xml(r.brand_code)}</g:brand>`,
        `<g:mpn>${xml(r.master_sku)}</g:mpn>`,
        `<g:condition>new</g:condition>`,
        `<g:product_type>${xml(catRu)}</g:product_type>`,
        '</item>',
      ].join('');
    })
    .join('\n');

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
    `<channel>\n` +
    `<title>${xml(SITE_NAME)}</title>\n` +
    `<link>${SITE_URL}</link>\n` +
    `<description>Запчасти для капремонта японских двигателей</description>\n` +
    `${items}\n` +
    `</channel>\n</rss>\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
