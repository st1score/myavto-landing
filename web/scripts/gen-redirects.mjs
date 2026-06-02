// Postbuild: generate static redirect stubs for legacy Astro URLs that Yandex/
// Google still have indexed (list in legacy-redirects/old-urls.txt). GitHub Pages
// can't do real 301s, so each old path gets an HTML stub with canonical +
// meta-refresh + JS redirect to the closest NEW page. Runs after `next build`
// and writes into out/ (never touches public/ or git).
//
// Target selection auto-improves as inventory grows: it queries the live catalog
// for which engine/category hubs actually exist, and points there; otherwise it
// falls back to the pistons category hub (always a selling page), or home.

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'out');
const SITE = 'https://my-avto.kz';

// Load .env.local for local runs (CI provides env directly).
try {
  const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {}

const CATEGORY_SLUG = { PISTON: 'porshni', RING: 'koltsa', BEARING: 'vkladyshi', LINER: 'gilzy', KIT: 'remkomplekty' };
const engineSlug = (c) => c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Old category URL segment → our category code.
const OLD_CAT = {
  porshni: 'PISTON',
  'koltsa-porshnevye': 'RING',
  kolca: 'RING',
  vkladyshi: 'BEARING',
  gilzy: 'LINER',
  remkomplekty: 'KIT',
};

// Paths owned by real Next routes — never shadow them with a redirect stub.
const isLiveRoute = (p) =>
  p === '/' ||
  p.startsWith('/p/') ||
  p.startsWith('/search') ||
  p.startsWith('/dashboard') ||
  p.startsWith('/login') ||
  p.startsWith('/dvigateli/') ||
  p.startsWith('/zapchasti/');

async function loadHubs() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) { console.warn('gen-redirects: no Supabase env, using category fallback only'); return { engines: new Set(), cats: new Set(['PISTON']) }; }
  const s = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await s.from('v_catalog').select('compatible_engines, category_code').eq('status', 'active');
  const engines = new Set();
  const cats = new Set();
  for (const r of data ?? []) {
    cats.add(r.category_code);
    for (const e of r.compatible_engines ?? []) engines.add(engineSlug(e));
  }
  return { engines, cats };
}

function pickTarget(p, hubs) {
  const seg = p.replace(/^\/|\/$/g, '').split('/');
  const categoryHub = (code) => (hubs.cats.has(code) && CATEGORY_SLUG[code] ? `/zapchasti/${CATEGORY_SLUG[code]}/` : '/zapchasti/porshni/');

  // /{brand}/dvigateli/{engine}/porshni/{sku}/  (560)  и  /{brand}/dvigateli/{engine}/{cat}/  (32)
  if (seg[1] === 'dvigateli' && seg[2]) {
    const eslug = engineSlug(seg[2]);
    if (hubs.engines.has(eslug)) return `/dvigateli/${eslug}/`;
    // engine not stocked → best category hub
    const catSeg = seg[4] ? 'porshni' : seg[3]; // sku path → pistons; else the listing category
    const code = OLD_CAT[catSeg] ?? 'PISTON';
    return categoryHub(code);
  }
  // /zapchasti handled by live route; /brendy/* and bare /{brand}/ and /landing/ → home
  return '/';
}

function stub(target, title) {
  const abs = SITE + target;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>${title}</title>
<link rel="canonical" href="${abs}">
<meta name="robots" content="noindex,follow">
<meta http-equiv="refresh" content="0; url=${target}">
<script>location.replace(${JSON.stringify(target)})</script>
</head><body>Страница переехала. <a href="${target}">Перейти</a>.</body></html>\n`;
}

const hubs = await loadHubs();
const paths = readFileSync(join(__dirname, 'legacy-redirects', 'old-urls.txt'), 'utf8')
  .split('\n').map((l) => l.trim()).filter(Boolean);

let written = 0, skipped = 0;
const targetCount = {};
for (const p of paths) {
  if (isLiveRoute(p)) { skipped++; continue; }
  const file = join(OUT, p.replace(/^\//, ''), 'index.html');
  if (existsSync(file)) { skipped++; continue; } // don't overwrite a real page
  const target = pickTarget(p, hubs);
  targetCount[target] = (targetCount[target] || 0) + 1;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, stub(target, 'MY AVTO — запчасти для японских двигателей'));
  written++;
}
console.log(`gen-redirects: ${written} stubs written, ${skipped} skipped`);
console.log('targets:', JSON.stringify(targetCount, null, 0));
