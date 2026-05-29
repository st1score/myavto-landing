// Pre-build search index: dump (engine_code, category_code) aggregated rows
// to public/search-index.json. One card on /search = one engine+category pair,
// not one SKU. Inside /p/{engine}/{category} variants are exposed.

import pg from 'pg';
import dotenv from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '..', '..', '.env') });
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const CATEGORY_SLUG = { PISTON: 'porshni', RING: 'koltsa', BEARING: 'vkladyshi', LINER: 'gilzy', KIT: 'remkomplekty' };
const CATEGORY_LABEL = { PISTON: 'Поршни', RING: 'Кольца', BEARING: 'Вкладыши', LINER: 'Гильзы', KIT: 'Ремкомплекты' };

if (!process.env.DATABASE_URL) {
  console.warn('[search-index] DATABASE_URL not set — writing empty index');
  const out = resolve(__dirname, '..', 'public', 'search-index.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ generated_at: new Date().toISOString(), products: [] }));
  process.exit(0);
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
});

async function dumpFromMv() {
  const { rows } = await pool.query(`
    SELECT
      engine_code,
      category_code,
      MAX(image_url) AS image_url,
      bool_or(in_stock) AS in_stock,
      SUM(stock_qty)::int AS stock_qty,
      count(*)::int AS variant_count,
      count(DISTINCT brand_name)::int AS brand_count,
      count(DISTINCT size_code)::int  AS size_count,
      array_agg(DISTINCT brand_name)::text[] AS brands,
      array_agg(DISTINCT size_code)::text[]  AS sizes,
      (ARRAY(SELECT DISTINCT unnest(oem_numbers)    FROM mv_search_products m2 WHERE m2.engine_code = mv.engine_code AND m2.category_code = mv.category_code))::text[] AS oem_numbers,
      (ARRAY(SELECT DISTINCT unnest(cross_numbers)  FROM mv_search_products m2 WHERE m2.engine_code = mv.engine_code AND m2.category_code = mv.category_code))::text[] AS cross_numbers,
      (ARRAY(SELECT DISTINCT unnest(engine_aliases) FROM mv_search_products m2 WHERE m2.engine_code = mv.engine_code AND m2.category_code = mv.category_code))::text[] AS engine_aliases,
      (ARRAY(SELECT DISTINCT unnest(vehicles)       FROM mv_search_products m2 WHERE m2.engine_code = mv.engine_code AND m2.category_code = mv.category_code))::text[] AS vehicles,
      MIN(price_kzt) AS price_from
    FROM mv_search_products mv
    GROUP BY engine_code, category_code
    ORDER BY in_stock DESC, engine_code, category_code
  `);
  return rows.map((r) => ({
    ...r,
    slug: `${r.engine_code.toLowerCase()}/${CATEGORY_SLUG[r.category_code] ?? r.category_code.toLowerCase()}`,
    category_label: CATEGORY_LABEL[r.category_code] ?? r.category_code,
    title: `${CATEGORY_LABEL[r.category_code] ?? r.category_code} ${r.engine_code}`,
  }));
}

async function main() {
  const products = await dumpFromMv();
  console.log(`[search-index] ${products.length} engine+category cards`);
  const out = resolve(__dirname, '..', 'public', 'search-index.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({
    generated_at: new Date().toISOString(),
    count: products.length,
    products,
  }));
  console.log(`[search-index] wrote ${out}`);
  await pool.end();
}

main().catch((e) => {
  console.error('[search-index] failed:', e);
  process.exit(1);
});
