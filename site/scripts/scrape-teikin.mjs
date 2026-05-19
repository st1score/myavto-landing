#!/usr/bin/env node
// Скачивает с teikin.com PDF на каждый engine_code (с поршнями в наличии)
// и кропает верх -> site/public/teikin-catalog/<engine-slug>.png.
//
// Запуск:
//   TEIKIN_EMAIL=... TEIKIN_PASSWORD=... node scripts/scrape-teikin.mjs
//
// Также читает DATABASE_URL из ../.env (как и сам сайт).

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(SITE_ROOT, '..');
const PDF_CACHE = resolve(__dirname, 'cache-teikin-pdfs');
const PNG_OUT = resolve(SITE_ROOT, 'public/teikin-catalog');
const COOKIE_FILE = resolve(__dirname, '.teikin-cookies.txt');

dotenv.config({ path: resolve(REPO_ROOT, '.env') });

const TEIKIN_EMAIL = process.env.TEIKIN_EMAIL;
const TEIKIN_PASSWORD = process.env.TEIKIN_PASSWORD;
if (!TEIKIN_EMAIL || !TEIKIN_PASSWORD) {
  console.error('Set TEIKIN_EMAIL and TEIKIN_PASSWORD env vars.');
  process.exit(1);
}

mkdirSync(PDF_CACHE, { recursive: true });
mkdirSync(PNG_OUT, { recursive: true });

// ---------- slug (повторяет логику site/src/lib/slugs.ts) ----------
const toSlug = (s) =>
  s.toLowerCase()
   .replace(/[\/\\]/g, '-')
   .replace(/[^a-z0-9а-я\-]+/gi, '-')
   .replace(/-+/g, '-')
   .replace(/^-|-$/g, '');

// ---------- curl-helpers ----------
const BASE = 'http://www.teikin.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

function curl(args) {
  return execFileSync('curl', ['-s', '--max-time', '30', '-A', UA, ...args], { encoding: 'utf8' });
}
function curlBin(args) {
  return execFileSync('curl', ['-s', '--max-time', '60', '-A', UA, ...args]);
}

function login() {
  if (existsSync(COOKIE_FILE)) unlinkSync(COOKIE_FILE);
  curl(['-c', COOKIE_FILE, `${BASE}/`, '-o', '/dev/null']);
  curl([
    '-b', COOKIE_FILE, '-c', COOKIE_FILE,
    '-X', 'POST', `${BASE}/catalogue`,
    '-d', 'action=pages_model.login_member',
    '--data-urlencode', `email=${TEIKIN_EMAIL}`,
    '--data-urlencode', `password=${TEIKIN_PASSWORD}`,
    '-L', '-o', '/dev/null',
  ]);
  const cookies = readFileSync(COOKIE_FILE, 'utf8');
  if (!cookies.includes('lx_session')) throw new Error('Login failed: no lx_session cookie');
  // Проверим что страница после логина показывает LOGOUT
  const page = curl(['-b', COOKIE_FILE, `${BASE}/catalogue`]);
  if (!/LOGOUT/i.test(page)) throw new Error('Login failed: no LOGOUT link');
  console.log('[login] OK');
}

function parseJson(s) {
  return JSON.parse(s.replace(/^﻿/, ''));
}

function getBrands() {
  const raw = curl(['-b', COOKIE_FILE, '-X', 'POST', `${BASE}/pages/get_brands`]);
  return parseJson(raw).data.map((x) => x.brand).filter(Boolean);
}

function getEngineModels(brand) {
  const raw = curl(['-b', COOKIE_FILE, `${BASE}/pages/get_engine_models?brand=${encodeURIComponent(brand)}`]);
  return parseJson(raw).data.map((x) => x.engine_model);
}

function searchByBrandEngine(brand, engineModel) {
  const raw = curl([
    '-b', COOKIE_FILE,
    '-X', 'POST', `${BASE}/pages/search_by_brand_engine`,
    '--data-urlencode', `brand=${brand}`,
    '--data-urlencode', `engine=${engineModel}`,
  ]);
  return parseJson(raw).data;
}

function downloadPdf(brandFile, dst) {
  if (existsSync(dst)) return;
  const url = brandFile.startsWith('http') ? brandFile : `${BASE}${brandFile.startsWith('/') ? '' : '/'}${brandFile}`;
  const buf = curlBin(['-b', COOKIE_FILE, '-L', url]);
  if (buf.length < 1000 || !buf.toString('binary', 0, 4).startsWith('%PDF')) {
    throw new Error(`Not a PDF: ${url} (${buf.length}b)`);
  }
  writeFileSync(dst, buf);
}

function cropTop(pdfPath, pngPath) {
  // -r 200 dpi, страница 1, верхние 870 px (A4 портрет даёт ~2339 px высоты)
  const tmpPrefix = pngPath.replace(/\.png$/, '');
  execFileSync('pdftoppm', [
    '-r', '200', '-f', '1', '-l', '1',
    '-y', '0', '-x', '0', '-W', '1654', '-H', '870',
    '-png', pdfPath, tmpPrefix,
  ]);
  // pdftoppm пишет <prefix>-1.png — переименуем
  const generated = `${tmpPrefix}-1.png`;
  if (existsSync(generated)) {
    execFileSync('mv', [generated, pngPath]);
  }
}

// ---------- DB ----------
async function getEnginesWithPistonStock() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
    max: 2,
  });
  const { rows } = await pool.query(`
    SELECT DISTINCT e.engine_code, e.brand_name
      FROM stock_items s
      JOIN engines e ON e.engine_code = s.engine_code
     WHERE s.category_code = 'PISTON' AND s.qty > 0 AND e.is_active = true
     ORDER BY e.brand_name, e.engine_code
  `);
  const oemQ = await pool.query(`
    SELECT engine_code, array_agg(number_value) AS oems
      FROM engine_part_numbers
     WHERE category_code = 'PISTON' AND number_type = 'OEM' AND is_active = true
     GROUP BY engine_code
  `);
  await pool.end();
  const oemMap = new Map(oemQ.rows.map((r) => [r.engine_code, r.oems]));
  return rows.map((r) => ({ ...r, oems: oemMap.get(r.engine_code) ?? [] }));
}

// ---------- matching ----------
// TEIKIN-модели бывают кластерами: "1KZ-TE, 1KZ" / "5L, 5LE" / "4D55, 4D56".
// Совпадение по точному токену (split по запятым/пробелам/слэшам).
function tokenizeTeikinModel(m) {
  return m
    .split(/[,/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function findTeikinModel(engineCode, teikinModels) {
  const code = engineCode.toUpperCase().trim();
  // 1. точное совпадение токена
  for (const m of teikinModels) {
    if (tokenizeTeikinModel(m).some((t) => t.toUpperCase() === code)) return m;
  }
  // 2. fallback: точное совпадение всей строки
  for (const m of teikinModels) if (m.toUpperCase() === code) return m;
  return null;
}

// ---------- main ----------
async function main() {
  console.log('[db] reading engines with piston stock...');
  const engines = await getEnginesWithPistonStock();
  console.log(`[db] ${engines.length} engines with piston stock`);

  login();
  const teikinBrands = new Set(getBrands().map((b) => b.toUpperCase()));
  console.log(`[teikin] ${teikinBrands.size} brands available`);

  const modelsCache = new Map();
  const report = { matched: [], unmatched: [], errors: [] };

  for (const eng of engines) {
    const dbBrand = eng.brand_name.trim().toUpperCase();
    if (!teikinBrands.has(dbBrand)) {
      report.unmatched.push({ ...eng, reason: 'brand not in TEIKIN' });
      continue;
    }
    if (!modelsCache.has(dbBrand)) modelsCache.set(dbBrand, getEngineModels(dbBrand));
    const models = modelsCache.get(dbBrand);
    const tm = findTeikinModel(eng.engine_code, models);
    if (!tm) {
      report.unmatched.push({ ...eng, reason: 'no engine_model match' });
      continue;
    }

    try {
      const hits = searchByBrandEngine(dbBrand, tm);
      if (!hits.length) {
        report.unmatched.push({ ...eng, reason: `empty search for "${tm}"` });
        continue;
      }
      // У одного мотора часто несколько артикулов, но все ведут на один PDF
      const pdfRel = hits[0].brand_file;
      const articles = hits.map((h) => h.brand_title);
      const slug = toSlug(eng.engine_code);
      const pdfPath = resolve(PDF_CACHE, `${slug}.pdf`);
      const pngPath = resolve(PNG_OUT, `${slug}.png`);

      downloadPdf(pdfRel, pdfPath);
      cropTop(pdfPath, pngPath);

      report.matched.push({ ...eng, teikin_model: tm, articles, pdf: pdfRel, png: pngPath });
      console.log(`[ok] ${eng.brand_name}/${eng.engine_code} -> ${tm} -> ${articles.join(',')}`);
    } catch (e) {
      report.errors.push({ ...eng, error: e.message });
      console.warn(`[err] ${eng.engine_code}: ${e.message}`);
    }
  }

  writeFileSync(resolve(__dirname, 'scrape-teikin-report.json'), JSON.stringify(report, null, 2));
  console.log(`\nDONE. matched=${report.matched.length} unmatched=${report.unmatched.length} errors=${report.errors.length}`);
  console.log(`Report: ${resolve(__dirname, 'scrape-teikin-report.json')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
