// Генерирует /public/search-index.json — компактный JSON-индекс для поиска
// в header (артикулы TEIKIN/OEM + коды двигателей).
// Запускать перед astro build.

import pg from 'pg';
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });
dotenv.config({ path: resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  console.error('[search-index] DATABASE_URL не задан');
  process.exit(1);
}

const brandSlug = {
  Toyota: 'toyota', Nissan: 'nissan', Mitsubishi: 'mitsubishi', Mazda: 'mazda',
  Honda: 'honda', Subaru: 'subaru', Suzuki: 'suzuki', Lexus: 'lexus', Infiniti: 'infiniti',
};
const categorySlug = { PISTON: 'porshni', RING: 'koltsa-porshnevye' };

function engineSlug(code) {
  return code.toLowerCase()
    .replace(/[\/\\]/g, '-')
    .replace(/[^a-z0-9а-я\-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
});

const engines = (await pool.query(`
  SELECT engine_code, brand_name, engine_name, volume_l, is_diesel
    FROM engines WHERE is_active = true
`)).rows;

const partNumbers = (await pool.query(`
  SELECT pn.engine_code, pn.category_code, pn.number_value, pn.number_type,
         e.brand_name
    FROM engine_part_numbers pn
    JOIN engines e USING (engine_code)
   WHERE pn.is_active = true AND e.is_active = true
`)).rows;

// Множества: какие (engine, category) реально доступны в каталоге (есть варианты)
const enginePartsAvail = new Set(
  (await pool.query(`
    SELECT DISTINCT engine_code, category_code FROM engine_parts WHERE is_active = true
  `)).rows.map((r) => `${r.engine_code}|${r.category_code}`)
);

await pool.end();

// Собираем индекс. Формат записи компактный:
//   t: тип ('e'=двигатель, 'a'=артикул)
//   q: текст для поиска (lowercased, без дефисов/пробелов)
//   l: лейбл (то что показываем юзеру)
//   s: сабтайтл (контекст: бренд+мотор / тип номера)
//   u: ссылка
const items = [];

for (const e of engines) {
  const bSlug = brandSlug[e.brand_name] ?? e.brand_name.toLowerCase();
  const ePath = `/${bSlug}/dvigateli/${engineSlug(e.engine_code)}/`;
  const vol = e.volume_l ? ` ${e.volume_l}L` : '';
  const fuel = e.is_diesel ? ' дизель' : '';
  items.push({
    t: 'e',
    q: `${e.engine_code} ${e.brand_name} ${e.engine_name ?? ''}`.toLowerCase().replace(/[\s\-]/g, ''),
    l: e.engine_code,
    s: `${e.brand_name}${vol}${fuel}`,
    u: ePath,
  });
}

for (const p of partNumbers) {
  const bSlug = brandSlug[p.brand_name] ?? p.brand_name.toLowerCase();
  const catSlug = categorySlug[p.category_code];
  if (!catSlug) continue;
  // линкуем на листинг (без знания размера — на SKU не уйдём)
  const path = `/${bSlug}/dvigateli/${engineSlug(p.engine_code)}/${catSlug}/`;
  // Показываем только если категория реально есть (иначе ссылка ведёт в никуда)
  if (!enginePartsAvail.has(`${p.engine_code}|${p.category_code}`)) continue;
  const catLabel = p.category_code === 'PISTON' ? 'Поршни' : 'Кольца';
  items.push({
    t: 'a',
    q: p.number_value.toLowerCase().replace(/[\s\-]/g, ''),
    l: p.number_value,
    s: `${p.number_type} · ${catLabel} ${p.brand_name} ${p.engine_code}`,
    u: path,
  });
}

// dedupe: один артикул может быть привязан к нескольким моторам — оставляем все,
// но добавим дополнительный q-вариант с дефисами для частичного матча
const out = {
  generated: new Date().toISOString(),
  count: items.length,
  items,
};

const outPath = resolve(__dirname, '../public/search-index.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out));
const sizeKB = (JSON.stringify(out).length / 1024).toFixed(1);
console.log(`[search-index] wrote ${items.length} items (${sizeKB} KB) → ${outPath}`);
